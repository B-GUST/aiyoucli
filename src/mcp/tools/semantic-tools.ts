import type { MCPTool, MCPToolResult } from "../../types.js";
import { createProxyEngine, type ProxyEngineHandle } from "../../napi/proxy.js";
import { computeHybridScores } from "../../semantic/agent-profiles.js";

let engine: ProxyEngineHandle | null = null;

function getEngine(): ProxyEngineHandle {
  if (!engine) {
    engine = createProxyEngine();
  }
  return engine;
}

async function runHybridRoute(task: string): Promise<Record<string, unknown>> {
  const e = getEngine();
  const kwResult = e.semanticRoute(task);
  const scores = await computeHybridScores(task, e);
  const hybridResult = e.semanticRouteHybrid(task, scores);
  return {
    route: hybridResult.route,
    confidence: hybridResult.confidence,
    model_tier: hybridResult.model_tier,
    method: "hybrid",
    keyword_result: kwResult,
    hybrid_result: hybridResult,
  };
}

function text(t: string): MCPToolResult {
  return { content: [{ type: "text", text: t }] };
}

function json(d: unknown): MCPToolResult {
  return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
}

export const semanticTools: MCPTool[] = [
  {
    name: "semantic_route",
    description: "Route a task description to the best agent type using keyword matching (8 agents: coder, tester, reviewer, architect, security, debugger, researcher, documenter)",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Task description to route" },
      },
      required: ["task"],
    },
    handler: async (input) => {
      try {
        const result = getEngine().semanticRoute(input.task as string);
        return json(result);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "semantic_route_hybrid",
    description: "Route a task with hybrid keyword + embedding scores for higher precision",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Task description to route" },
        embedding_scores: {
          type: "object",
          description: "Embedding scores per agent: {\"coder\": 0.8, \"tester\": 0.2, ...}",
          additionalProperties: { type: "number" },
        },
      },
      required: ["task", "embedding_scores"],
    },
    handler: async (input) => {
      try {
        const result = getEngine().semanticRouteHybrid(
          input.task as string,
          input.embedding_scores as Record<string, number>
        );
        return json(result);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "semantic_embed",
    description: "Get an 8-dimension keyword-based embedding vector for a text",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to embed" },
      },
      required: ["text"],
    },
    handler: async (input) => {
      try {
        const embedding = getEngine().semanticEmbed(input.text as string);
        return json({ embedding, dimensions: embedding.length });
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "semantic_stats",
    description: "Get semantic router statistics — agents, keywords, patterns, config",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      try {
        const stats = getEngine().semanticStats();
        return json(stats);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "semantic_route_enhanced",
    description: "Route a task using hybrid keyword + embedding (via gateway) for highest accuracy. Combines keyword matching with embedding similarity.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Task description to route" },
      },
      required: ["task"],
    },
    handler: async (input) => {
      try {
        const result = await runHybridRoute(input.task as string);
        return json(result);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },
];
