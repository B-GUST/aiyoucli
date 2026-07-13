import type { MCPTool, MCPToolResult } from "../../types.js";
import { createProxyEngine, type ProxyEngineHandle } from "../../napi/proxy.js";

let engine: ProxyEngineHandle | null = null;

function getEngine(): ProxyEngineHandle {
  if (!engine) {
    engine = createProxyEngine();
  }
  return engine;
}

function text(t: string): MCPToolResult {
  return { content: [{ type: "text", text: t }] };
}

function json(d: unknown): MCPToolResult {
  return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
}

export const astTools: MCPTool[] = [
  {
    name: "ast_analyze",
    description: "Analyze source code — extract functions, classes, imports, complexity (supports JS, TS, Python, Rust, Go, Java)",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path (used to detect language)" },
        source: { type: "string", description: "Source code content" },
      },
      required: ["path", "source"],
    },
    handler: async (input) => {
      try {
        const result = getEngine().analyzeCode(
          input.path as string,
          input.source as string
        );
        return json(result);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "ast_analyze_batch",
    description: "Analyze multiple source files at once",
    inputSchema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 2,
            description: "[path, source] pair",
          },
          description: "Array of [path, source] pairs",
        },
      },
      required: ["files"],
    },
    handler: async (input) => {
      try {
        const files = input.files as Array<[string, string]>;
        const result = getEngine().analyzeCodeBatch(files);
        return json(result);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "ast_detect_language",
    description: "Detect the programming language of a file by its path extension",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path to detect language for" },
      },
      required: ["path"],
    },
    handler: async (input) => {
      try {
        const lang = getEngine().detectLanguage(input.path as string);
        return text(lang);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },
];
