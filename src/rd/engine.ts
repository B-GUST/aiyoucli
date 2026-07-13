export interface ResearchSession {
  sessionId: string;
  query: string;
  strategy: string;
  status: "initialized" | "in_progress" | "completed" | "failed";
  config: ResearchConfig;
  result?: ResearchResult;
}

export interface ResearchConfig {
  strategy: string;
  maxIterations: number;
  maxSubIterations: number;
  includeSubResearch: boolean;
  questionsPerIteration: number;
  promptKnowledgeTruncate: number;
  previousSearchesLimit: number;
  enableAdaptiveQuestions: boolean;
  enableEarlyTermination: boolean;
}

export interface ResearchResult {
  researchId: string;
  query: string;
  summary: string;
  sources: SourceInfo[];
  iterations: number;
  totalSources: number;
  knowledgeGraphNodes: number;
  citations: string[];
  durationMs: number;
}

export interface SourceInfo {
  url: string;
  title: string;
  snippet: string;
  sourceType: string;
  relevanceScore: number;
}

export interface DocumentInfo {
  path: string;
  format: string;
  title: string;
  size: number;
  pages: number;
  processed: boolean;
}

export interface SearchResult {
  query: string;
  engine: string;
  results: SourceInfo[];
  totalResults: number;
  durationMs: number;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  type: string;
  sources: string[];
  connections: string[];
}

export class ResearchEngine {
  private sessions: Map<string, ResearchSession> = new Map();

  createSession(query: string, config?: Partial<ResearchConfig>): ResearchSession {
    const sessionId = `rd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const defaultConfig: ResearchConfig = {
      strategy: "langgraph-agent",
      maxIterations: 50,
      maxSubIterations: 8,
      includeSubResearch: true,
      questionsPerIteration: 5,
      promptKnowledgeTruncate: 1500,
      previousSearchesLimit: 10,
      enableAdaptiveQuestions: false,
      enableEarlyTermination: false,
    };

    const session: ResearchSession = {
      sessionId,
      query,
      strategy: config?.strategy ?? "langgraph-agent",
      status: "initialized",
      config: { ...defaultConfig, ...config },
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): ResearchSession | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(): ResearchSession[] {
    return Array.from(this.sessions.values());
  }

  getAvailableStrategies(): Array<{ name: string; description: string }> {
    return [
      {
        name: "langgraph-agent",
        description: "Autonomous agentic research where the LLM decides what to search, which engines to use, and when to synthesize",
      },
      {
        name: "source-based",
        description: "Focuses on finding and extracting from sources with cross-engine filtering",
      },
      {
        name: "focused-iteration",
        description: "Iterative focused research with adaptive questions and knowledge summation",
      },
      {
        name: "topic-organization",
        description: "Organizes findings into topics with structured output",
      },
      {
        name: "quick",
        description: "Quick single-pass research summary (30s-3min)",
      },
    ];
  }
}

let _instance: ResearchEngine | null = null;

export function getResearchEngine(): ResearchEngine {
  if (!_instance) {
    _instance = new ResearchEngine();
  }
  return _instance;
}
