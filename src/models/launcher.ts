import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { ChildProcess } from "node:child_process";
import type { ModelAssignment, RunningModel } from "./types.js";

const runningServers: Map<string, ChildProcess> = new Map();

export function startServer(
  assignment: ModelAssignment
): RunningModel | { error: string } {
  if (!existsSync(assignment.path)) {
    return { error: `Modelo no encontrado: ${assignment.path}` };
  }

  const startedAt = new Date().toISOString();

  try {
    const proc = spawn("llama-server", [
      "-m", assignment.path,
      "--port", String(assignment.port),
      "--host", "127.0.0.1",
      "--no-webui",
    ], {
      stdio: "ignore",
      detached: true,
    });

    const key = `${assignment.role}`;
    runningServers.set(key, proc);

    proc.unref();

    return {
      pid: proc.pid ?? 0,
      assignment,
      startedAt,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Error iniciando llama-server: ${msg}` };
  }
}

export function stopServer(role: string): boolean {
  const proc = runningServers.get(role);
  if (!proc || !proc.pid) return false;

  try {
    process.kill(proc.pid, "SIGTERM");
    runningServers.delete(role);
    return true;
  } catch {
    return false;
  }
}

export function stopAll(): { stopped: string[]; errors: string[] } {
  const stopped: string[] = [];
  const errors: string[] = [];

  for (const [role, proc] of runningServers.entries()) {
    if (!proc.pid) {
      errors.push(`${role}: sin PID`);
      continue;
    }
    try {
      process.kill(proc.pid, "SIGTERM");
      stopped.push(role);
    } catch {
      errors.push(`${role}: no se pudo detener`);
    }
  }
  runningServers.clear();
  return { stopped, errors };
}

export function getRunningServers(): { role: string; pid: number }[] {
  const result: { role: string; pid: number }[] = [];
  for (const [role, proc] of runningServers.entries()) {
    if (proc.pid) {
      try {
        process.kill(proc.pid, 0);
        result.push({ role, pid: proc.pid });
      } catch {
        runningServers.delete(role);
      }
    }
  }
  return result;
}

export function isPortInUse(port: number): boolean {
  try {
    execSync(`lsof -i :${port} -t`, { encoding: "utf-8", timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
