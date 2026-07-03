import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { ChildProcess } from "node:child_process";
import type { ModelAssignment, RunningModel } from "./types.js";

const runningServers: Map<string, ChildProcess> = new Map();

let _llamaServerPath: string | null = null;

function getLlamaServerPath(): string {
  if (_llamaServerPath) return _llamaServerPath;

  try {
    const result = execSync("which llama-server 2>/dev/null", { encoding: "utf-8", timeout: 5000 }).trim();
    if (result) {
      _llamaServerPath = result;
      return result;
    }
  } catch {
    // not in PATH
  }

  const commonPaths = [
    "/home/august/code/llama.cpp/build/bin/llama-server",
    "/usr/local/bin/llama-server",
    "/usr/bin/llama-server",
    "/opt/llama.cpp/build/bin/llama-server",
    "/opt/homebrew/bin/llama-server",
  ];

  for (const p of commonPaths) {
    if (existsSync(p)) {
      _llamaServerPath = p;
      return p;
    }
  }

  _llamaServerPath = "llama-server";
  return _llamaServerPath;
}

export function startServer(
  assignment: ModelAssignment
): Promise<RunningModel | { error: string }> {
  return new Promise((resolve) => {
    if (!existsSync(assignment.path)) {
      resolve({ error: `Modelo no encontrado: ${assignment.path}` });
      return;
    }

    const startedAt = new Date().toISOString();

    try {
      const binPath = getLlamaServerPath();
      const proc = spawn(binPath, [
        "-m", assignment.path,
        "--port", String(assignment.port),
        "--host", "127.0.0.1",
      ], {
        stdio: "ignore",
        detached: true,
      });

      const key = `${assignment.role}`;

      proc.on("error", (err) => {
        resolve({ error: `Error iniciando llama-server: ${err.message}` });
      });

      proc.on("spawn", () => {
        runningServers.set(key, proc);
        proc.unref();
        resolve({
          pid: proc.pid ?? 0,
          assignment,
          startedAt,
        });
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      resolve({ error: `Error iniciando llama-server: ${msg}` });
    }
  });
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
