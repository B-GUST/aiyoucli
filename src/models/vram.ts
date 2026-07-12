import { execSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { GpuInfo, ModelEntry, ValidationResult } from "./types.js";

const VRAM_TABLE: Record<string, number> = {
  "DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf": 1.4,
  "deepseek-coder-1.3b-instruct.Q4_K_M.gguf": 1.3,
  "DeepSeek-R1-Distill-Qwen-7B-IQ2_M.gguf": 2.5,
  "gemma-2-2b-it-Q4_K_M.gguf": 2.0,
  "gemma-2-27b-it-IQ2_M.gguf": 9.0,
  "gemma-4-E2B-it-qat-UD-Q4_K_XL.gguf": 2.8,
  "gemma-4-E2B_q4_0-it.gguf": 3.5,
  "granite-3.0-2b-instruct-Q4_K_M.gguf": 1.8,
  "granite-3.0-3b-a800m-instruct-Q4_K_M.gguf": 2.2,
  "granite-4.0-1b-Q4_K_M.gguf": 1.0,
  "granite-4.0-h-micro-Q4_K_M.gguf": 0.8,
  "granite-4.0-h-tiny-Q4_K_M.gguf": 0.6,
  "granite-4.1-3b-Q4_K_M.gguf": 2.5,
  "granite-8b-code-instruct-128k.Q4_K_M.gguf": 5.2,
  "granite-guardian-3.0-2b.Q4_K_M.gguf": 1.8,
  "Llama-3.2-1B-Instruct-Q4_K_M.gguf": 1.0,
  "Llama-3.2-3B-Instruct-Q4_K_M.gguf": 2.4,
  "Ministral-3-3B-Instruct-2512-Q4_K_M.gguf": 2.5,
  "Nemotron-Mini-4B-Instruct-Q4_K_M.gguf": 3.0,
  "Phi-3.5-mini-instruct-Q4_K_M.gguf": 2.5,
  "Phi-4-mini-reasoning-Q4_K_M.gguf": 3.2,
  "qwen2.5-3b-instruct-q4_k_m.gguf": 2.4,
  "Qwen2.5-7B-Instruct-IQ2_M.gguf": 3.0,
  "Qwen2.5-7B-Instruct-Q4_K_M.gguf": 4.9,
  "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf": 1.2,
  "qwen2.5-coder-3b-instruct-q4_k_m.gguf": 2.4,
  "qwen2.5-coder-7b-instruct-q4_k_m.gguf": 4.8,
  "SmolLM2-1.7B-Instruct-Q4_K_M.gguf": 1.4,
};

export function getModelVram(modelName: string): number {
  return VRAM_TABLE[modelName] ?? 2.0;
}

export function detectGpuInfo(): GpuInfo {
  try {
    const out = execSync(
      "nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader",
      { encoding: "utf-8", timeout: 5000 }
    ).trim();
    const parts = out.split(", ");
    if (parts.length >= 3) {
      const name = parts[0];
      const total = parseInt(parts[1], 10);
      const free = parseInt(parts[2], 10);
      return { name, totalMemMiB: total, freeMemMiB: free, available: true };
    }
  } catch {
    // nvidia-smi not available, try other methods
  }

  try {
    const out = execSync("rocm-smi --json", {
      encoding: "utf-8",
      timeout: 5000,
    });
    const data = JSON.parse(out);
    const first = Object.values(data)[0] as Record<string, string>;
    if (first) {
      const total = parseInt(first["VRAM Total Memory (MB)"] ?? "0", 10);
      const free = parseInt(first["VRAM Free Memory (MB)"] ?? "0", 10);
      return {
        name: first["Card series"] ?? "AMD GPU",
        totalMemMiB: total,
        freeMemMiB: free,
        available: total > 0,
      };
    }
  } catch {
    // rocm-smi not available
  }

  return {
    name: "unknown",
    totalMemMiB: 6144,
    freeMemMiB: 4096,
    available: false,
  };
}

export function estimateCpuMode(totalRamMiB: number): GpuInfo {
  return {
    name: "CPU (RAM)",
    totalMemMiB: totalRamMiB,
    freeMemMiB: Math.round(totalRamMiB * 0.7),
    available: false,
  };
}

export function validateCombination(
  models: { file: string }[],
  freeVramGB: number
): ValidationResult {
  const modelVrams = models.map((m) => ({
    name: m.file,
    vramGB: getModelVram(m.file),
  }));
  const totalVramGB = modelVrams.reduce((sum, m) => sum + m.vramGB, 0);

  const suggestions: string[] = [];
  if (totalVramGB > freeVramGB) {
    const sorted = [...modelVrams].sort((a, b) => a.vramGB - b.vramGB);
    suggestions.push(
      `Prueba con modelos mas pequeños: ${sorted.slice(0, 2).map((m) => m.name).join(", ")}`
    );
    suggestions.push(`O usa modo uni-model con un solo modelo de hasta ${freeVramGB.toFixed(1)}GB`);
  }

  return {
    valid: totalVramGB <= freeVramGB,
    totalVramGB,
    freeVramGB,
    models: modelVrams,
    message: totalVramGB <= freeVramGB
      ? `✅ ${totalVramGB.toFixed(1)} GB de ${freeVramGB.toFixed(1)} GB libres`
      : `✗ ${totalVramGB.toFixed(1)} GB estimados, solo ${freeVramGB.toFixed(1)} GB libres`,
    suggestions,
  };
}

export function listLocalModels(modelsPath: string): ModelEntry[] {
  if (!existsSync(modelsPath)) {
    return [];
  }

  const entries: ModelEntry[] = [];
  for (const file of readdirSync(modelsPath)) {
    if (!file.endsWith(".gguf")) continue;
    const fullPath = join(modelsPath, file);
    const st = statSync(fullPath);
    if (!st.isFile()) continue;
    const sizeGB = st.size / (1024 * 1024 * 1024);
    const quant = detectQuant(file);
    entries.push({
      name: file,
      path: join(modelsPath, file),
      sizeGB: Math.round(sizeGB * 100) / 100,
      quant,
      estimatedVramGB: getModelVram(file),
      exists: true,
    });
  }
  return entries;
}

function detectQuant(fileName: string): string {
  const match = fileName.match(/-(Q[0-9]_[A-Z_]+|q[0-9]_[a-z_0-9]+|IQ[0-9]_[A-Z]+)\.gguf$/);
  return match?.[1] ?? "unknown";
}
