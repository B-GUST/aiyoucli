/**
 * Proxy tools — LLM gateway, compression, firewall, shield, embeddings.
 * Uses the aiyoucli-proxy NAPI binary for Rust-native performance.
 */

import type { MCPTool, MCPToolResult } from "../../types.js";
import { createProxyEngine, type ProxyEngineHandle } from "../../napi/proxy.js";
import { execSync } from "node:child_process";

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

export const proxyTools: MCPTool[] = [
  {
    name: "proxy_chat",
    description: "Send a chat completion to the local LLM gateway (http://127.0.0.1:8000/v1)",
    inputSchema: {
      type: "object",
      properties: {
        messages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role: { type: "string", description: "system, user, or assistant" },
              content: { type: "string", description: "Message content" },
            },
          },
          description: "Array of chat messages",
        },
        model: {
          type: "string",
          description: "Model override (default: gpt-4)",
        },
      },
      required: ["messages"],
    },
    handler: async (input) => {
      try {
        const result = getEngine().chatCompletion(
          input.messages as Array<{ role: string; content: string }>,
          input.model as string | undefined
        );
        return json(result);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "proxy_health",
    description: "Check if the LLM provider/gateway is reachable",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      try {
        const result = getEngine().healthCheck();
        return json(result);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "proxy_shield_check",
    description: "Check content against shield rules (prompt injection, blocked keywords, high entropy)",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Content to check" },
      },
      required: ["content"],
    },
    handler: async (input) => {
      try {
        const result = getEngine().shieldCheck(input.content as string);
        return json(result);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "proxy_compress",
    description: "Compress chat messages by pruning and truncating to reduce token usage",
    inputSchema: {
      type: "object",
      properties: {
        messages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role: { type: "string" },
              content: { type: "string" },
            },
          },
          description: "Array of chat messages to compress",
        },
        max_messages: {
          type: "number",
          description: "Maximum messages to keep (default: 20)",
        },
        max_message_chars: {
          type: "number",
          description: "Maximum characters per message (default: 4000)",
        },
      },
      required: ["messages"],
    },
    handler: async (input) => {
      try {
        const result = getEngine().compressMessages(
          input.messages as Array<{ role: string; content: string }>,
          input.max_messages as number | undefined,
          input.max_message_chars as number | undefined
        );
        return json(result);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "proxy_analyze_text",
    description: "Analyze text for compression opportunities and token estimation",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to analyze" },
      },
      required: ["text"],
    },
    handler: async (input) => {
      try {
        const result = getEngine().analyzeText(input.text as string);
        return json(result);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "proxy_segment",
    description: "Split text into chunks for processing (fixed-size or by sentence)",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to segment" },
        method: {
          type: "string",
          enum: ["chunks", "sentences"],
          description: "Segmentation method (default: chunks)",
        },
        chunk_size: {
          type: "number",
          description: "Chunk size in characters for 'chunks' method (default: 2000)",
        },
        overlap: {
          type: "number",
          description: "Overlap between chunks in characters (default: 0)",
        },
        max_chars: {
          type: "number",
          description: "Max chars per segment for 'sentences' method (default: 2000)",
        },
      },
      required: ["text"],
    },
    handler: async (input) => {
      try {
        const method = (input.method as string) || "chunks";
        const text = input.text as string;
        let result;
        if (method === "sentences") {
          result = getEngine().segmentBySentences(text, input.max_chars as number | undefined);
        } else {
          result = getEngine().segmentByChunks(
            text,
            (input.chunk_size as number) || 2000,
            input.overlap as number | undefined
          );
        }
        return json(result);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "proxy_list_models",
    description: "List available LLM models, optionally filtered by provider",
    inputSchema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          enum: ["openai", "anthropic", "custom"],
          description: "Filter by provider (optional)",
        },
      },
    },
    handler: async (input) => {
      try {
        const result = getEngine().listModels(input.provider as string | undefined);
        return json(result);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "proxy_estimate_cost",
    description: "Estimate the cost of a model call based on token counts",
    inputSchema: {
      type: "object",
      properties: {
        model: { type: "string", description: "Model name" },
        input_tokens: { type: "number", description: "Input token count" },
        output_tokens: { type: "number", description: "Output token count" },
      },
      required: ["model", "input_tokens", "output_tokens"],
    },
    handler: async (input) => {
      try {
        const result = getEngine().estimatedCost(
          input.model as string,
          input.input_tokens as number,
          input.output_tokens as number
        );
        return json(result);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "proxy_embed",
    description: "Generate text embeddings via the local gateway",
    inputSchema: {
      type: "object",
      properties: {
        texts: {
          type: "array",
          items: { type: "string" },
          description: "Texts to embed",
        },
      },
      required: ["texts"],
    },
    handler: async (input) => {
      try {
        const texts = input.texts as string[];
        if (texts.length === 1) {
          const result = getEngine().embedText(texts[0]);
          return json(result);
        }
        const result = getEngine().embedTexts(texts);
        return json(result);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "proxy_cache_stats",
    description: "Get response cache statistics",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      try {
        const result = getEngine().cacheStats();
        return json(result);
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "proxy_optimize_context",
    description: "Limpia la caché de respuestas, obtiene el contexto de Git (GCC) y comprime el historial de chat para optimizar el tamaño de contexto de un modelo local de menos de 4GB VRAM.",
    inputSchema: {
      type: "object",
      properties: {
        messages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role: { type: "string" },
              content: { type: "string" }
            },
            required: ["role", "content"]
          },
          description: "Historial de mensajes de la interacción"
        },
        max_messages: {
          type: "number",
          description: "Número máximo de mensajes a conservar (default: 10)"
        },
        max_message_chars: {
          type: "number",
          description: "Límite de caracteres por mensaje individual (default: 2000)"
        },
        clear_cache: {
          type: "boolean",
          description: "Limpiar la caché activa del LLM Proxy (default: true)"
        },
        include_git: {
          type: "boolean",
          description: "Incluir el contexto de Git condensado de GCC (default: true)"
        }
      },
      required: ["messages"]
    },
    handler: async (input) => {
      try {
        const messages = (input.messages as Array<{ role: string; content: string }>) || [];
        const maxMessages = (input.max_messages as number) || 10;
        const maxChars = (input.max_message_chars as number) || 2000;
        const shouldClearCache = input.clear_cache !== false;
        const includeGit = input.include_git !== false;

        // 1. Limpiar caché del proxy
        if (shouldClearCache) {
          getEngine().clearCache();
        }

        // 2. Obtener contexto de Git si se solicita
        let gitSummary = "";
        if (includeGit) {
          const git = (cmd: string) => {
            try {
              return execSync(`git ${cmd}`, { encoding: "utf-8", timeout: 3000 }).trim();
            } catch {
              return "";
            }
          };
          const branch = git("rev-parse --abbrev-ref HEAD");
          const status = git("status --porcelain");
          const diff = git("diff --stat");
          const staged = git("diff --cached --stat");
          
          if (branch) {
            gitSummary = `[Git Workspace Status]\nBranch: ${branch}\n`;
            if (status) {
              const lines = status.split("\n").filter(Boolean);
              gitSummary += `Modified files (${lines.length}):\n${lines.slice(0, 5).join("\n")}${lines.length > 5 ? "\n..." : ""}\n`;
            }
            if (diff) {
              gitSummary += `Unstaged changes:\n${diff.split("\n").slice(0, 5).join("\n")}\n`;
            }
            if (staged) {
              gitSummary += `Staged changes:\n${staged.split("\n").slice(0, 5).join("\n")}\n`;
            }
          }
        }

        // 3. Comprimir y podar mensajes
        let pruned: Array<{ role: string; content: string }> = [];
        let systemPrompt: { role: string; content: string } | null = null;
        
        if (messages.length > 0 && messages[0].role === "system") {
          systemPrompt = messages[0];
        }

        const startIdx = systemPrompt ? 1 : 0;
        const history = messages.slice(startIdx);
        
        if (history.length > maxMessages) {
          const keepCount = maxMessages - (systemPrompt ? 1 : 0);
          const start = history.length - keepCount;
          pruned = history.slice(start);
        } else {
          pruned = [...history];
        }

        // Truncar caracteres en los mensajes del medio
        pruned = pruned.map((m, idx) => {
          // No truncamos el último mensaje (es la consulta directa actual del usuario)
          if (idx === pruned.length - 1) return m;
          
          if (m.content.length > maxChars) {
            const headLen = Math.floor(maxChars * 0.4);
            const tailLen = maxChars - headLen - 3;
            const content = m.content.slice(0, headLen) + "..." + m.content.slice(m.content.length - tailLen);
            return { role: m.role, content };
          }
          return m;
        });

        // Insertar prompt de sistema si existía
        if (systemPrompt) {
          pruned.unshift(systemPrompt);
        }

        // 4. Inyectar Git context como mensaje de sistema justo antes de la última instrucción
        if (gitSummary && pruned.length > 0) {
          const lastMsg = pruned.pop()!;
          pruned.push({
            role: "system",
            content: `El desarrollador está trabajando en un repositorio git. Aquí está el contexto actual del workspace:\n${gitSummary}`
          });
          pruned.push(lastMsg);
        }

        return json({
          success: true,
          cache_cleared: shouldClearCache,
          original_length: messages.length,
          final_length: pruned.length,
          optimized_messages: pruned
        });
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    }
  },
];
