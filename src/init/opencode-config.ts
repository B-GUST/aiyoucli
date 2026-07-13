import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const OPENCODE_CONFIG_PATH = join(homedir(), ".config", "opencode", "config.json");

export interface OpenCodeConfig {
  provider?: Record<string, ProviderConfig>;
  model?: string;
  small_model?: string;
  mcp?: Record<string, MCPConfig>;
  [key: string]: unknown;
}

interface ProviderConfig {
  npm?: string;
  name?: string;
  options?: {
    baseURL?: string;
    apiKey?: string;
  };
  models?: Record<string, ModelConfig>;
}

interface ModelConfig {
  name?: string;
  limit?: { context?: number; output?: number };
  agent?: Record<string, AgentRoleConfig>;
}

interface AgentRoleConfig {
  description?: string;
  mode: string;
  model: string;
  tools: Record<string, boolean>;
  prompt?: string;
}

interface MCPConfig {
  type: string;
  command?: string[];
  enabled: boolean;
}

export function updateOpenCodeConfig(modelFile: string, modelName: string, port: number): { ok: boolean; message: string } {
  if (!existsSync(OPENCODE_CONFIG_PATH)) {
    return { ok: false, message: `No se encontro ${OPENCODE_CONFIG_PATH}` };
  }

  try {
    const raw = readFileSync(OPENCODE_CONFIG_PATH, "utf-8");
    const config: OpenCodeConfig = JSON.parse(raw);

    if (!config.provider) config.provider = {};
    if (!config.provider["llama.cpp"]) {
      config.provider["llama.cpp"] = {
        npm: "@ai-sdk/openai-compatible",
        name: "Local llama.cpp",
        options: {
          baseURL: "http://localhost:8000/v1",
          apiKey: "sk-local",
        },
        models: {},
      };
    }

    const llmProvider = config.provider["llama.cpp"];
    if (!llmProvider.models) llmProvider.models = {};

    if (llmProvider.models[modelName]) {
      return { ok: false, message: `El modelo ${modelName} ya existe en opencode config` };
    }

    llmProvider.models[modelName] = {
      name: modelName,
      limit: { context: 32768, output: 8192 },
      agent: {
        build: {
          mode: "primary",
          model: `llama.cpp/${modelName}`,
          tools: { write: true, edit: true, bash: true },
        },
        plan: {
          mode: "primary",
          model: `llama.cpp/${modelName}`,
          tools: { write: false, edit: false, bash: false },
        },
        reviewer: {
          description: "Experto en Code Review",
          mode: "subagent",
          model: `llama.cpp/${modelName}`,
          prompt: "Eres un revisor de codigo senior. Analiza deudas tecnicas, modularizacion y seguridad.",
          tools: { write: false, edit: false },
        },
      },
    };

    config.provider["llama.cpp"] = llmProvider;
    writeFileSync(OPENCODE_CONFIG_PATH, JSON.stringify(config, null, 2));

    return { ok: true, message: `Modelo ${modelName} agregado a opencode config` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Error actualizando opencode config: ${msg}` };
  }
}

export function setDefaultModel(modelName: string): { ok: boolean; message: string } {
  if (!existsSync(OPENCODE_CONFIG_PATH)) {
    return { ok: false, message: `No se encontro ${OPENCODE_CONFIG_PATH}` };
  }

  try {
    const raw = readFileSync(OPENCODE_CONFIG_PATH, "utf-8");
    const config: OpenCodeConfig = JSON.parse(raw);

    config.model = `llama.cpp/${modelName}`;
    if (!config.small_model) {
      config.small_model = `llama.cpp/${modelName}`;
    }

    writeFileSync(OPENCODE_CONFIG_PATH, JSON.stringify(config, null, 2));

    return { ok: true, message: `Modelo default actualizado a llama.cpp/${modelName}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Error actualizando default model: ${msg}` };
  }
}

export function setupAbstractOpenCodeConfig(): { ok: boolean; message: string } {
  if (!existsSync(OPENCODE_CONFIG_PATH)) {
    return { ok: false, message: `No se encontró ${OPENCODE_CONFIG_PATH}` };
  }

  try {
    const raw = readFileSync(OPENCODE_CONFIG_PATH, "utf-8");
    const config: OpenCodeConfig = JSON.parse(raw);

    if (!config.provider) config.provider = {};
    
    // Configurar el provider llama.cpp de forma abstracta
    config.provider["llama.cpp"] = {
      npm: "@ai-sdk/openai-compatible",
      name: "localmodel",
      options: {
        baseURL: "http://localhost:8000/v1",
        apiKey: "sk-local",
      },
      models: {
        "cerebro": {
          name: "cerebro",
          limit: { context: 32768, output: 8192 },
          options: {
            baseURL: "http://localhost:8000/v1",
            apiKey: "sk-local"
          },
          agent: {
            plan: {
              mode: "primary",
              model: "llama.cpp/cerebro",
              tools: { write: false, edit: false, bash: false }
            },
            reviewer: {
              description: "Experto en Code Review",
              mode: "subagent",
              model: "llama.cpp/cerebro",
              prompt: "Eres un revisor de codigo senior. Analiza deudas tecnicas, modularizacion y seguridad.",
              tools: { write: false, edit: false }
            }
          }
        },
        "Ejecutor": {
          name: "Ejecutor",
          limit: { context: 32768, output: 8192 },
          options: {
            baseURL: "http://localhost:8001/v1",
            apiKey: "sk-local"
          },
          agent: {
            build: {
              mode: "primary",
              model: "llama.cpp/Ejecutor",
              tools: { write: true, edit: true, bash: true }
            }
          }
        },
        "Auditor": {
          name: "Auditor",
          limit: { context: 32768, output: 8192 },
          options: {
            baseURL: "http://localhost:8002/v1",
            apiKey: "sk-local"
          }
        }
      }
    } as any;

    config.model = "llama.cpp/cerebro";
    config.small_model = "llama.cpp/Ejecutor";

    writeFileSync(OPENCODE_CONFIG_PATH, JSON.stringify(config, null, 2));
    return { ok: true, message: "Mapeo abstracto en OpenCode config (cerebro, Ejecutor, Auditor) establecido." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Error configurando mapeo abstracto de OpenCode: ${msg}` };
  }
}
