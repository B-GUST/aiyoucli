import type { ProxyEngineHandle } from "../napi/proxy.js";

export interface AgentProfile {
  name: string;
  model_tier: string;
  keywords: Array<[string, number]>;
  patterns: string[];
}

export const AGENT_PROFILES: AgentProfile[] = [
  {
    name: "coder",
    model_tier: "sonnet",
    keywords: [
      ["implement", 0.9], ["code", 0.7], ["write", 0.5], ["create", 0.4],
      ["function", 0.8], ["class", 0.7], ["api", 0.6], ["endpoint", 0.6],
      ["feature", 0.6], ["module", 0.5], ["refactor", 0.7],
      ["frontend", 0.5], ["backend", 0.6], ["authentication", 0.6],
      ["database", 0.5], ["schema", 0.5], ["query", 0.5],
    ],
    patterns: [
      "implement", "code", "develop", "build", "write.*function",
      "create.*api", "add.*feature",
    ],
  },
  {
    name: "tester",
    model_tier: "haiku",
    keywords: [
      ["test", 0.9], ["spec", 0.8], ["assertion", 0.7], ["mock", 0.6],
      ["coverage", 0.6], ["unit test", 0.9], ["integration test", 0.8],
      ["e2e", 0.7], ["testing", 0.8], ["jest", 0.6], ["pytest", 0.6],
      ["regression", 0.5], ["tdd", 0.6],
    ],
    patterns: [
      "write.*test", "unit test", "integration test", "e2e.*test",
      "test.*coverage", "mock.*service",
    ],
  },
  {
    name: "architect",
    model_tier: "opus",
    keywords: [
      ["architecture", 0.9], ["design", 0.7], ["system", 0.6],
      ["microservice", 0.7], ["distributed", 0.7], ["scalable", 0.6],
      ["infrastructure", 0.5], ["deployment", 0.5], ["ci/cd", 0.5],
      ["ddd", 0.6], ["domain", 0.5], ["tech stack", 0.5],
    ],
    patterns: [
      "system design", "architecture decision", "distributed system",
      "microservice.*architecture",
    ],
  },
  {
    name: "reviewer",
    model_tier: "sonnet",
    keywords: [
      ["review", 0.9], ["audit", 0.7], ["inspect", 0.5], ["quality", 0.5],
      ["lint", 0.5], ["code review", 0.9], ["pull request", 0.7],
      ["pr", 0.5], ["standards", 0.5], ["validate", 0.5],
    ],
    patterns: [
      "code review", "pull request review", "audit.*code",
    ],
  },
  {
    name: "security",
    model_tier: "sonnet",
    keywords: [
      ["security", 0.9], ["vulnerability", 0.9], ["exploit", 0.7],
      ["encryption", 0.7], ["xss", 0.7], ["sql injection", 0.8],
      ["csrf", 0.7], ["owasp", 0.7], ["penetration", 0.6],
      ["oauth", 0.5], ["jwt", 0.5], ["audit", 0.6],
      ["secure", 0.6], ["threat", 0.6],
    ],
    patterns: [
      "security audit", "vulnerability.*scan", "penetration test",
      "security review",
    ],
  },
  {
    name: "debugger",
    model_tier: "sonnet",
    keywords: [
      ["debug", 0.9], ["fix", 0.7], ["bug", 0.8], ["error", 0.6],
      ["crash", 0.6], ["exception", 0.6], ["stack trace", 0.7],
      ["issue", 0.5], ["problem", 0.5], ["log", 0.4],
      ["diagnose", 0.6], ["troubleshoot", 0.5], ["null", 0.4],
    ],
    patterns: [
      "fix.*bug", "debug.*issue", "resolve.*error",
      "troubleshoot.*problem",
    ],
  },
  {
    name: "documenter",
    model_tier: "haiku",
    keywords: [
      ["document", 0.9], ["readme", 0.7], ["docs", 0.7], ["api doc", 0.6],
      ["wiki", 0.6], ["guide", 0.6], ["tutorial", 0.5], ["changelog", 0.5],
      ["comment", 0.5], ["explain", 0.5], ["migration guide", 0.5],
    ],
    patterns: [
      "write.*documentation", "generate.*docs", "document.*api",
      "create.*readme",
    ],
  },
  {
    name: "researcher",
    model_tier: "sonnet",
    keywords: [
      ["research", 0.9], ["investigate", 0.7], ["explore", 0.5],
      ["analyze", 0.7], ["feasibility", 0.6], ["proof of concept", 0.6],
      ["poc", 0.5], ["prototype", 0.6], ["benchmark", 0.5],
      ["comparison", 0.5], ["evaluate", 0.5], ["spike", 0.5],
    ],
    patterns: [
      "research.*topic", "investigate.*approach", "feasibility.*study",
      "proof.*concept", "spike.*investigation",
    ],
  },
];

export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return norm === 0 ? v : v.map(x => x / norm);
}

export function computeKeywordScores(task: string): Record<string, number> {
  const lower = task.toLowerCase();
  const scores: Record<string, number> = {};
  for (const profile of AGENT_PROFILES) {
    let score = 0;
    for (const [kw, weight] of profile.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += weight;
      }
    }
    for (const pattern of profile.patterns) {
      try {
        if (new RegExp(pattern, "i").test(lower)) {
          score += 1.0;
        }
      } catch { }
    }
    scores[profile.name] = score;
  }
  return scores;
}

export async function computeHybridScores(
  task: string,
  engine: ProxyEngineHandle,
): Promise<Record<string, number>> {
  const kwScores = computeKeywordScores(task);
  let embedding: number[] | null = null;
  try {
    const result = engine.embedText(task);
    if (result.embedding && result.embedding.length > 0) {
      embedding = result.embedding;
    }
  } catch { }

  if (!embedding || embedding.length === 0) {
    return kwScores;
  }

  const normalizedEmbedding = normalize(embedding);
  const dim = Math.min(embedding.length, AGENT_PROFILES.length * 48);
  const agentEmbeddings = AGENT_PROFILES.map((_, i) => {
    const start = (i * dim) / AGENT_PROFILES.length;
    return normalizedEmbedding.slice(Math.floor(start), Math.floor(start + dim / AGENT_PROFILES.length));
  });

  const hybrid: Record<string, number> = {};
  for (let i = 0; i < AGENT_PROFILES.length; i++) {
    const profile = AGENT_PROFILES[i];
    const sim = agentEmbeddings[i].length > 0
      ? computeCosineSimilarity(normalizedEmbedding.slice(0, agentEmbeddings[i].length), agentEmbeddings[i])
      : 0;
    hybrid[profile.name] = kwScores[profile.name] * 0.6 + sim * 0.4;
  }
  return hybrid;
}
