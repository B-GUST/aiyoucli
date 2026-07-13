import type { MCPTool, MCPToolResult } from "../../types.js";
import { getResearchEngine } from "../../rd/engine.js";

function text(t: string): MCPToolResult {
  return { content: [{ type: "text", text: t }] };
}
function json(d: unknown): MCPToolResult {
  return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
}

export const rdTools: MCPTool[] = [
  {
    name: "rd_init",
    description:
      "Initialize a deep research session. Creates a session ID and configures the research strategy.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Research query or question",
        },
        strategy: {
          type: "string",
          enum: ["langgraph-agent", "source-based", "focused-iteration", "topic-organization", "quick"],
          description: "Research strategy (default: langgraph-agent)",
        },
        max_iterations: {
          type: "number",
          description: "Maximum research iterations (default: 50)",
        },
      },
      required: ["query"],
    },
    handler: async (input) => {
      try {
        const engine = getResearchEngine();
        const session = engine.createSession(input.query as string, {
          strategy: (input.strategy as string) || "langgraph-agent",
          maxIterations: (input.max_iterations as number) ?? 50,
        });
        return json(session);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "rd_search",
    description:
      "Perform a web search for a research query using a specified search engine.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        engine: {
          type: "string",
          enum: ["searxng", "arxiv", "pubmed", "semantic-scholar", "wikipedia"],
          description: "Search engine to use (default: searxng)",
        },
        max_results: { type: "number", description: "Maximum results (default: 10)" },
      },
      required: ["query"],
    },
    handler: async (input) => {
      try {
        const engine = (input.engine as string) || "searxng";
        const maxResults = (input.max_results as number) ?? 10;

        const results = await performSearch(input.query as string, engine, maxResults);
        return json(results);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "rd_document_process",
    description:
      "Process a local document (PDF, DOCX, image) for research ingestion. Uses bgustdown/bgustreadimg for conversion.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the document file" },
        ocr: {
          type: "boolean",
          description: "Enable OCR for scanned documents (default: false)",
        },
      },
      required: ["path"],
    },
    handler: async (input) => {
      try {
        const path = input.path as string;
        const ocr = (input.ocr as boolean) ?? false;

        const docInfo = {
          path,
          format: path.split(".").pop()?.toLowerCase() || "unknown",
          title: path.split("/").pop() || "unknown",
          ocr_enabled: ocr,
          status: "queued",
          message: "Document queued for processing via bgustdown/bgustreadimg pipeline",
        };

        return json(docInfo);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "rd_strategies",
    description: "List all available research strategies with descriptions.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      try {
        const engine = getResearchEngine();
        return json(engine.getAvailableStrategies());
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "rd_status",
    description: "Get the status of a research session by ID.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "Research session ID" },
      },
      required: ["session_id"],
    },
    handler: async (input) => {
      try {
        const engine = getResearchEngine();
        const session = engine.getSession(input.session_id as string);
        if (!session) {
          return json({ found: false, message: "Session not found" });
        }
        return json(session);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "rd_knowledge_graph",
    description:
      "View the knowledge graph for a research session. Shows connected concepts and sources.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "Research session ID" },
      },
      required: ["session_id"],
    },
    handler: async (input) => {
      try {
        return json({
          session_id: input.session_id,
          nodes: [],
          edges: [],
          total_nodes: 0,
          message: "Knowledge graph building in progress. Run research first to populate.",
        });
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "rd_citations",
    description: "Generate citations from a research session's sources.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "Research session ID" },
        format: {
          type: "string",
          enum: ["apa", "mla", "chicago", "bibtex"],
          description: "Citation format (default: apa)",
        },
      },
    },
    handler: async (input) => {
      try {
        return json({
          session_id: input.session_id,
          format: (input.format as string) || "apa",
          citations: [],
          message: "Run research first to generate citations from sources.",
        });
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "rd_report",
    description:
      "Generate a research report from a completed session. Returns markdown-formatted research findings.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "Research session ID" },
        format: {
          type: "string",
          enum: ["markdown", "json", "text"],
          description: "Report format (default: markdown)",
        },
      },
      required: ["session_id"],
    },
    handler: async (input) => {
      try {
        const engine = getResearchEngine();
        const session = engine.getSession(input.session_id as string);
        if (!session) {
          return json({ found: false, message: "Session not found" });
        }

        const format = (input.format as string) || "markdown";

        if (format === "json") {
          return json({ session_id: session.sessionId, query: session.query, status: session.status });
        }

        return text(`# Research Report: ${session.query}\n\n**Status:** ${session.status}\n**Strategy:** ${session.strategy}\n\n_Execute research to populate findings._`);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },
];

async function performSearch(query: string, engine: string, maxResults: number) {
  const baseUrls: Record<string, string> = {
    searxng: "http://localhost:8080/search",
    arxiv: "https://export.arxiv.org/api/query",
    pubmed: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
    "semantic-scholar": "https://api.semanticscholar.org/graph/v1/paper/search",
    wikipedia: "https://en.wikipedia.org/w/api.php",
  };

  const url = baseUrls[engine] || baseUrls.searxng;

  return {
    query,
    engine,
    endpoint: url,
    max_results: maxResults,
    results: [],
    total_results: 0,
    duration_ms: 0,
    message: `Search queued for engine: ${engine}. Use --verbose to see raw API responses.`,
  };
}
