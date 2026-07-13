import type { MCPTool, MCPToolResult } from "../../types.js";
import { existsSync, readdirSync, lstatSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadConfig } from "../../config.js";

function text(t: string): MCPToolResult {
  return { content: [{ type: "text", text: t }] };
}
function json(d: unknown): MCPToolResult {
  return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
}

const QUANT_PATTERN = /-(Q[0-9]_[A-Z0-9_]+|q[0-9]_[a-z0-9_]+)\.gguf$/i;
const MODEL_NAME_PATTERN = /^(.+?)-(Q[0-9_]|q[0-9_]|[0-9]+[bB])/;

const UNSLOTH_ALT: Record<string, Record<string, string>> = {
  "llama-3.1-8b": {
    unsloth: "unsloth/Llama-3.1-8B-Instruct-GGUF",
    note: "Unsloth Dynamic v2.0 — Q4_K_M matches Q5_K_M standard accuracy",
  },
  "llama-3.1-70b": {
    unsloth: "unsloth/Llama-3.1-70B-Instruct-GGUF",
    note: "Unsloth Dynamic v2.0 — ~40% less VRAM at same accuracy",
  },
  "llama-3.2-1b": {
    unsloth: "unsloth/Llama-3.2-1B-Instruct-GGUF",
    note: "Unsloth Dynamic v2.0 — optimal for edge deployment",
  },
  "llama-3.2-3b": {
    unsloth: "unsloth/Llama-3.2-3B-Instruct-GGUF",
    note: "Unsloth Dynamic v2.0 — best accuracy-per-byte ratio",
  },
  "qwen2.5-7b": {
    unsloth: "unsloth/Qwen2.5-7B-Instruct-GGUF",
    note: "Unsloth Dynamic v2.0 — superior conversational performance",
  },
  "qwen2.5-14b": {
    unsloth: "unsloth/Qwen2.5-14B-Instruct-GGUF",
    note: "Unsloth Dynamic v2.0 — 4-bit matches 6-bit standard",
  },
  "qwen2.5-32b": {
    unsloth: "unsloth/Qwen2.5-32B-Instruct-GGUF",
    note: "Unsloth Dynamic v2.0 — layer-specific quantization",
  },
  "mistral-7b": {
    unsloth: "unsloth/Mistral-7B-Instruct-v0.3-GGUF",
    note: "Unsloth Dynamic v2.0 — customized RoPE and attention",
  },
  "deepseek-llm-67b": {
    unsloth: "unsloth/DeepSeek-LLM-67B-Chat-GGUF",
    note: "Unsloth Dynamic v2.0 — MoE-optimized quantization",
  },
  "deepseek-v2": {
    unsloth: "unsloth/DeepSeek-V2-Lite-Chat-GGUF",
    note: "Unsloth Dynamic v2.0 — 1.58-bit MoE pioneer",
  },
  "gemma-2-2b": {
    unsloth: "unsloth/Gemma-2-2B-it-GGUF",
    note: "Unsloth Dynamic v2.0 — model-specific layer selection",
  },
  "gemma-2-9b": {
    unsloth: "unsloth/Gemma-2-9B-it-GGUF",
    note: "Unsloth Dynamic v2.0 — attention-optimized layout",
  },
  "phi-3-mini": {
    unsloth: "unsloth/Phi-3-mini-4k-instruct-GGUF",
    note: "Unsloth Dynamic v2.0 — 3x faster at Q4_K_M vs standard",
  },
  "phi-3-medium": {
    unsloth: "unsloth/Phi-3-medium-4k-instruct-GGUF",
    note: "Unsloth Dynamic v2.0 — cache-optimized inference",
  },
  "codellama-7b": {
    unsloth: "unsloth/CodeLlama-7B-Instruct-GGUF",
    note: "Unsloth Dynamic v2.0 — preserves code generation accuracy",
  },
  "codellama-13b": {
    unsloth: "unsloth/CodeLlama-13B-Instruct-GGUF",
    note: "Unsloth Dynamic v2.0 — better KL divergence than standard",
  },
  "codellama-34b": {
    unsloth: "unsloth/CodeLlama-34B-Instruct-GGUF",
    note: "Unsloth Dynamic v2.0 — ~30% lower perplexity gap",
  },
  "mixtral-8x7b": {
    unsloth: "unsloth/Mixtral-8x7B-Instruct-v0.1-GGUF",
    note: "Unsloth Dynamic v2.0 — MoE-specific optimizations",
  },
  "llama-3-8b": {
    unsloth: "unsloth/Llama-3-8B-Instruct-GGUF",
    note: "Unsloth Dynamic v2.0 — calibration dataset (300K-1.5M tokens)",
  },
  "llama-3-70b": {
    unsloth: "unsloth/Llama-3-70B-Instruct-GGUF",
    note: "Unsloth Dynamic v2.0 — higher MMLU at same bitrate",
  },
  "nous-hermes-2-mixtral": {
    unsloth: "unsloth/Nous-Hermes-2-Mixtral-8x7B-DPO-GGUF",
    note: "Unsloth Dynamic v2.0 — curated calibration improves chat",
  },
  "dolphin-2.9-llama3-8b": {
    unsloth: "unsloth/Dolphin-2.9-Llama3-8B-GGUF",
    note: "Unsloth Dynamic v2.0 — better instruction following",
  },
  "starling-lm-7b": {
    unsloth: "unsloth/Starling-LM-7B-beta-GGUF",
    note: "Unsloth Dynamic v2.0 — RLHF-optimized quantization",
  },
  "neural-chat-7b": {
    unsloth: "unsloth/Neural-Chat-7B-v3-3-GGUF",
    note: "Unsloth Dynamic v2.0 — Intel-optimized layer selection",
  },
  "openchat-3.5": {
    unsloth: "unsloth/OpenChat-3.5-0106-GGUF",
    note: "Unsloth Dynamic v2.0 — better long-context accuracy",
  },
};

function normalizeModelName(filename: string): string {
  const base = filename.replace(/\.gguf$/i, "");
  const m = base.match(MODEL_NAME_PATTERN);
  if (m) return m[1].toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return base.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function parseQuantization(filename: string): string {
  const m = filename.match(QUANT_PATTERN);
  if (m) return m[1];
  const lower = filename.toLowerCase();
  if (lower.includes("q4")) return "Q4 (detected)";
  if (lower.includes("q5")) return "Q5 (detected)";
  if (lower.includes("q8") || lower.includes("fp16")) return "Q8/FP16 (detected)";
  if (lower.includes("q2")) return "Q2 (detected)";
  if (lower.includes("q3")) return "Q3 (detected)";
  if (lower.includes("q6")) return "Q6 (detected)";
  return "unknown";
}

const QUANT_ORDER: Record<string, number> = {
  "Q2_K": 0, "Q2_K_S": 0, "Q2_K_M": 0,
  "Q3_K_S": 1, "Q3_K_M": 1, "Q3_K_L": 1,
  "Q4_0": 2, "Q4_1": 2, "Q4_K_S": 2, "Q4_K_M": 2,
  "Q5_0": 3, "Q5_1": 3, "Q5_K_S": 3, "Q5_K_M": 3,
  "Q6_K": 4, "Q8_0": 5, "F16": 6,
};

const QUANT_NAMES: Record<string, [number, string]> = {
  "Q2_K": [0, "2-bit — minimal, high loss"],
  "Q3_K_M": [1, "3-bit — moderate, usable for small models"],
  "Q4_K_M": [2, "4-bit — sweet spot, recommended"],
  "Q5_K_M": [3, "5-bit — higher quality, ~20% more RAM"],
  "Q6_K": [4, "6-bit — near-lossless, ~40% more RAM"],
  "Q8_0": [5, "8-bit — essentially lossless"],
  "F16": [6, "16-bit — full precision, high RAM"],
};

function parseQuantLevel(quant: string): number {
  return QUANT_ORDER[quant] ?? -1;
}

function findGgufModels(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry.startsWith(".")) continue;
    if (lstatSync(full).isDirectory()) {
      results.push(...findGgufModels(full));
    } else if (entry.toLowerCase().endsWith(".gguf") && !entry.startsWith(".")) {
      results.push(full);
    }
  }
  return results.sort();
}

function findUnslothAlt(normalized: string): Record<string, string> | null {
  const direct = UNSLOTH_ALT[normalized];
  if (direct) return direct;
  for (const [key, val] of Object.entries(UNSLOTH_ALT)) {
    if (normalized.includes(key) || key.includes(normalized)) return val;
  }
  return null;
}

export const modelsTools: MCPTool[] = [
  {
    name: "models_list",
    description: "Scan a directory for GGUF models. Shows quantization, size, and Unsloth Dynamic v2.0 upgrade recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory to scan for GGUF files (default: .aiyoucli/models/ or env AIYOUCLI_MODELS_PATH)",
        },
      },
    },
    handler: async (input) => {
      try {
        const config = loadConfig();
        const defaultDir = join(config.projectRoot, ".aiyoucli", "models");
        const scanDir = (input.path as string) || process.env.AIYOUCLI_MODELS_PATH || defaultDir;

        if (!existsSync(scanDir)) {
          return json({
            scanned_path: scanDir,
            exists: false,
            message: `Models directory not found: ${scanDir}. Create one or set AIYOUCLI_MODELS_PATH.`,
            models: [],
          });
        }

        const files = findGgufModels(scanDir);
        if (files.length === 0) {
          return json({
            scanned_path: scanDir,
            exists: true,
            message: `No GGUF files found in ${scanDir}`,
            models: [],
          });
        }

        const models = files.map((f) => {
          const name = f.split("/").pop() ?? f;
          const stats = lstatSync(f);
          const sizeGb = (stats.size / (1024 * 1024 * 1024)).toFixed(2);
          const quant = parseQuantization(name);
          const normalized = normalizeModelName(name);
          const alt = findUnslothAlt(normalized);
          const quantLevel = quant.startsWith("Q") ? parseQuantLevel(quant) : -1;
          return {
            file: name,
            path: f,
            size_gb: parseFloat(sizeGb),
            quantization: quant,
            quant_level: quantLevel,
            normalized_name: normalized,
            unsloth_upgrade: alt
              ? {
                  repo: alt.unsloth,
                  note: alt.note,
                  download_cmd: `huggingface-cli download ${alt.unsloth} --local-dir ${scanDir}`,
                }
              : null,
          };
        });

        const totalSizeGb = models.reduce((s, m) => s + m.size_gb, 0);

        return json({
          scanned_path: scanDir,
          exists: true,
          total_models: models.length,
          total_size_gb: parseFloat(totalSizeGb.toFixed(2)),
          models,
        });
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },

  {
    name: "models_optimize",
    description: "Recommend the best Unsloth Dynamic v2.0 GGUF for a given model name or file.",
    inputSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description: "Model name (e.g. llama-3.1-8b, mistral-7b) or GGUF filename",
        },
      },
      required: ["model"],
    },
    handler: async (input) => {
      try {
        const modelInput = input.model as string;
        const normalized = normalizeModelName(modelInput);
        const alt = findUnslothAlt(normalized);

        if (!alt) {
          const suggestions = Object.keys(UNSLOTH_ALT)
            .filter((k) => k.includes(normalized.slice(0, 4)) || normalized.includes(k.slice(0, 4)))
            .slice(0, 5);

          return json({
            model: modelInput,
            normalized,
            found: false,
            message: `No Unsloth Dynamic v2.0 known for "${normalized}"`,
            nearby: suggestions.length > 0
              ? suggestions.map((s) => ({
                  name: s,
                  unsloth: UNSLOTH_ALT[s].unsloth,
                }))
              : undefined,
          });
        }

        return json({
          model: modelInput,
          normalized,
          found: true,
          recommendation: alt,
          quantization_guide: {
            Q2_K: "Minimal RAM, high loss — for testing only",
            Q3_K_M: "Moderate — usable for small or MoE models",
            Q4_K_M: "Recommended sweet spot — best accuracy per GB",
            Q5_K_M: "Higher quality — if you have RAM headroom",
            Q8_0: "Near-lossless — for critical accuracy work",
          },
          download: {
            huggingface_cli: `huggingface-cli download ${alt.unsloth}`,
            curl: `curl -L -o ${alt.unsloth.split("/").pop()}.gguf "https://huggingface.co/${alt.unsloth}/resolve/main/"{quant}".gguf"`,
            note: "Replace {quant} with desired quantization (Q4_K_M, Q5_K_M, Q8_0, etc.)",
          },
        });
      } catch (e) {
        return text(`Error: ${(e as Error).message}`);
      }
    },
  },
];