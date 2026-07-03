import { existsSync, statSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { color } from "../output.js";
import { ask, confirm } from "../init/interactive.js";
import type { WorkMode, ModelRole, GpuInfo, ModelEntry, RunningModel, ModelEngineState } from "./types.js";
import { detectGpuInfo, getModelVram, validateCombination, listLocalModels } from "./vram.js";
import { checkMinioHealth, listModelsInBucket, downloadModel, getModelsDir } from "./minio.js";
import { startServer, stopAll, isPortInUse } from "./launcher.js";
import { updateOpenCodeConfig, setDefaultModel } from "../init/opencode-config.js";

const STATE_FILE = join(homedir(), ".aiyoucli", "models-state.json");

const MODEL_ROLES: ModelRole[] = ["central", "executor", "auditor"];
const ROLE_PORTS: Record<ModelRole, number> = { central: 8000, executor: 8001, auditor: 8002 };

function getRoleCount(mode: WorkMode): number {
  switch (mode) {
    case "uni-model": return 1;
    case "dual-model": return 2;
    case "tree-model": return 3;
  }
}

function getRolesForMode(mode: WorkMode): ModelRole[] {
  return MODEL_ROLES.slice(0, getRoleCount(mode));
}

function saveState(state: ModelEngineState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function cleanModelName(file: string): string {
  return file
    .replace(/\.gguf$/i, "")
    .replace(/-(Q[0-9]_[A-Z_]+|q[0-9]_[a-z_0-9]+|IQ[0-9]_[A-Z]+)$/i, "")
    .replace(/[._]/g, "-")
    .toLowerCase();
}

function loadState(): ModelEngineState | null {
  try {
    const data = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    return data as ModelEngineState;
  } catch {
    return null;
  }
}

async function selectModel(prompt: string, available: ModelEntry[], defaultName?: string): Promise<ModelEntry | null> {
  console.log(`\n  ${color.bold(prompt)}`);
  const filtered = available.filter((m) => m.name !== "embed-server.py" && !m.name.startsWith("all-MiniLM"));

  for (let i = 0; i < filtered.length; i++) {
    const m = filtered[i];
    const check = m.name === defaultName ? color.green(" ⟵ default") : "";
    const exists = m.exists ? color.dim(" [local]") : "";
    console.log(`  ${i + 1}. ${m.name} ${color.dim(`(${m.estimatedVramGB.toFixed(1)}GB VRAM)`)}${exists}${check}`);
  }

  const answer = await ask(`  > Selecciona un modelo (1-${filtered.length})${defaultName ? ` [default: ${defaultName}]` : ""}: `);
  if (answer === "" && defaultName) {
    const found = filtered.find((m) => m.name === defaultName) ?? filtered[0];
    return found;
  }
  const idx = parseInt(answer, 10) - 1;
  if (idx >= 0 && idx < filtered.length) {
    return filtered[idx];
  }
  return filtered[0];
}

async function selectWorkMode(): Promise<WorkMode> {
  console.log(`\n  ${color.bold("Work mode:")}`);
  const modes: { label: string; value: WorkMode; desc: string }[] = [
    { label: "uni-model",  value: "uni-model",  desc: "1 modelo central" },
    { label: "dual-model", value: "dual-model", desc: "central + executor" },
    { label: "tree-model", value: "tree-model", desc: "central + executor + auditor" },
  ];

  for (let i = 0; i < modes.length; i++) {
    console.log(`  ${i + 1}. ${color.cyan(modes[i].label)}  ${color.dim(modes[i].desc)}`);
  }

  const answer = await ask("  > Selecciona modo de trabajo (1-3) [default: uni-model]: ");
  const idx = parseInt(answer, 10) - 1;
  if (idx >= 0 && idx < modes.length) {
    return modes[idx].value;
  }
  return "uni-model";
}

export async function startInteractive(
  defaultModel?: string
): Promise<{ ok: boolean; running: RunningModel[]; message: string }> {
  console.log(`\n${color.bold(color.cyan("■ aiyoucli models start"))}\n`);

  const modelsDir = getModelsDir();

  const minio = checkMinioHealth();
  if (minio.ok) {
    console.log(`  ${color.green("✓")} MinIO: ${minio.message}`);
  } else {
    console.log(`  ${color.yellow("⚠")} ${minio.message}`);
  }

  const gpu: GpuInfo = detectGpuInfo();
  const freeVramGB = gpu.freeMemMiB / 1024;
  if (gpu.available) {
    console.log(`  ${color.green("✓")} GPU: ${gpu.name} (${freeVramGB.toFixed(1)} GB libres)`);
  } else {
    console.log(`  ${color.yellow("⚠")} GPU: no detectada, usando default ${freeVramGB.toFixed(1)} GB`);
  }

  const localModels = listLocalModels(modelsDir);
  const bucketModels = minio.ok ? listModelsInBucket() : [];
  const localFiles = new Set(localModels.map((m) => m.name));
  const availableModels: ModelEntry[] = [
    ...localModels,
    ...bucketModels
      .filter((f) => !localFiles.has(f))
      .map((f) => ({
        name: f,
        path: join(modelsDir, f),
        sizeGB: 0,
        quant: "unknown",
        estimatedVramGB: getModelVram(f),
        exists: false,
      })),
  ];

  if (availableModels.length === 0) {
    return { ok: false, running: [], message: "No hay modelos disponibles en MinIO ni localmente." };
  }

  console.log(`  ${color.green("✓")} ${availableModels.length} modelos disponibles (${localModels.length} locales)`);

  const workMode = await selectWorkMode();
  const roles = getRolesForMode(workMode);

  const selected: { file: string; path: string; role: ModelRole; port: number }[] = [];

  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    const port = ROLE_PORTS[role];

    if (isPortInUse(port) && port !== ROLE_PORTS.central) {
      console.log(`  ${color.yellow(`⚠ Puerto ${port} en uso, seleccionando puerto alternativo`)}`);
    }

    const model = await selectModel(
      i === 0 ? `Modelo ${color.cyan(role)} (puerto ${port}):` : `Modelo ${color.cyan(role)} (puerto ${port}):`,
      availableModels,
      i === 0 ? (defaultModel ?? "gemma-4-E2B-it-qat-UD-Q4_K_XL.gguf") : undefined
    );

    if (!model) {
      return { ok: false, running: [], message: "Seleccion cancelada." };
    }

    selected.push({ file: model.name, path: model.path, role, port });
  }

  const validation = validateCombination(
    selected.map((s) => ({ file: s.file })),
    freeVramGB
  );

  console.log(`\n  ${color.bold("Resumen:")}`);
  console.log(`  Modo:     ${color.cyan(workMode)}`);
  for (const s of selected) {
    const vram = getModelVram(s.file);
    console.log(`  ${color.dim(s.role.padEnd(10))} ${s.file}  ${color.dim(`(${vram.toFixed(1)}GB, :${s.port})`)}`);
  }
  console.log(`  ${validation.message}`);

  if (!validation.valid) {
    console.log("");
    for (const s of validation.suggestions) {
      console.log(`  ${color.yellow("→")} ${s}`);
    }
    return { ok: false, running: [], message: "Combinacion invalida por VRAM." };
  }

  const ok = await confirm("\n  Confirmar y lanzar?");
  if (!ok) {
    return { ok: false, running: [], message: "Cancelado por el usuario." };
  }

  for (const s of selected) {
    if (!existsSync(s.path) || !statSync(s.path).isFile()) {
      console.log(`  ${color.dim("Descargando")} ${s.file} desde MinIO...`);
      const dl = downloadModel(s.file);
      if (!dl.ok) {
        return { ok: false, running: [], message: dl.message };
      }
      s.path = dl.path;
    } else {
      console.log(`  ${color.green("✓")} ${s.file} ya esta localmente`);
    }
  }

  const running: RunningModel[] = [];
  for (const s of selected) {
    const result = await startServer({ role: s.role, file: s.file, path: s.path, port: s.port });
    if ("error" in result) {
      stopAll();
      return { ok: false, running: [], message: result.error };
    }
    running.push(result);
    console.log(`  ${color.green("✓")} llama-server iniciado (PID ${result.pid}) en puerto ${s.port} — ${s.file}`);
  }

  const state: ModelEngineState = {
    running,
    startedAt: new Date().toISOString(),
    workMode,
  };
  saveState(state);

  for (const r of running) {
    const modelName = cleanModelName(r.assignment.file);
    const opencodeResult = updateOpenCodeConfig(r.assignment.file, modelName, r.assignment.port);
    if (opencodeResult.ok) {
      console.log(`  ${color.green("✓")} ${opencodeResult.message}`);
    } else {
      console.log(`  ${color.yellow("⚠")} ${opencodeResult.message}`);
    }
  }

  const firstRunning = running[0];
  if (firstRunning) {
    const modelName = cleanModelName(firstRunning.assignment.file);
    const defaultResult = setDefaultModel(modelName);
    if (defaultResult.ok) {
      console.log(`  ${color.green("✓")} ${defaultResult.message}`);
    }
  }

  displayStatus(running);
  return { ok: true, running, message: "Modelos iniciados correctamente." };
}

export function displayStatus(running: RunningModel[]): void {
  console.log(`\n  ${color.bold("🟢 Modelos activos")}`);
  for (const r of running) {
    console.log(`  ${color.cyan(r.assignment.role.padEnd(10))} → ${r.assignment.file}  :${r.assignment.port}  PID ${r.pid}`);
  }
}

export function showStatus(): string {
  const state = loadState();
  if (!state || state.running.length === 0) {
    return "No hay modelos activos.";
  }

  let out = `Modo: ${state.workMode}\n`;
  for (const r of state.running) {
    out += `  ${r.assignment.role} → ${r.assignment.file} :${r.assignment.port} (PID ${r.pid})\n`;
  }
  return out;
}

export function stopInteractive(): { ok: boolean; message: string } {
  const state = loadState();
  if (!state) {
    return { ok: false, message: "No hay sesion activa de modelos." };
  }

  const { stopped, errors } = stopAll();

  const statePath = STATE_FILE;
  try {
    unlinkSync(statePath);
  } catch {}

  const msg = stopped.length > 0
    ? `Detenidos: ${stopped.join(", ")}`
    : "No habia modelos activos";
  if (errors.length > 0) {
    return { ok: true, message: `${msg}. Errores: ${errors.join(", ")}` };
  }
  return { ok: true, message: msg };
}
