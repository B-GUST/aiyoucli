import { spawn, execSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import http from "node:http";
import { join } from "node:path";
import { homedir } from "node:os";
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
    join(homedir(), "code/llama.cpp/build/bin/llama-server"),
    "/usr/local/bin/llama-server",
    "/usr/bin/llama-server",
    "/opt/llama.cpp/build/bin/llama-server",
    "/opt/homebrew/bin/llama-server",
  ];

  for (const p of commonPaths) {
    if (p && existsSync(p)) {
      _llamaServerPath = p;
      return p;
    }
  }

  _llamaServerPath = "llama-server";
  return _llamaServerPath;
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForReady(host: string, port: number, timeout: number): Promise<boolean> {
  const start = Date.now();
  return new Promise((resolve) => {
    function poll() {
      if (Date.now() - start > timeout) return resolve(false);
      const req = http.get({ host, port, path: "/v1/models", timeout: 5000 }, (res) => {
        const ready = res.statusCode === 200;
        res.destroy();
        if (ready) return resolve(true);
        setTimeout(poll, 2000);
      });
      req.on("error", () => {
        req.destroy();
        setTimeout(poll, 2000);
      });
      req.on("timeout", () => {
        req.destroy();
        setTimeout(poll, 2000);
      });
    }
    poll();
  });
}

export function startServer(
  assignment: ModelAssignment
): Promise<RunningModel | { error: string }> {
  return new Promise((resolve) => {
    if (!existsSync(assignment.path)) {
      resolve({ error: `Modelo no encontrado: ${assignment.path}` });
      return;
    }
    if (!statSync(assignment.path).isFile()) {
      resolve({ error: `La ruta no es un archivo valido: ${assignment.path}` });
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

      let resolved = false;

      proc.on("error", (err) => {
        if (!resolved) {
          resolved = true;
          resolve({ error: `Error iniciando llama-server: ${err.message}` });
        }
      });

      proc.on("spawn", () => {
        runningServers.set(key, proc);
        proc.unref();
        console.log(`  ${assignment.role} esperando a que el servidor este listo en :${assignment.port}...`);
      });

      proc.on("exit", (code, signal) => {
        runningServers.delete(key);
        if (!resolved) {
          resolved = true;
          resolve({ error: `llama-server (${assignment.role}) termino antes de estar listo. Código: ${code ?? "unknown"}${signal ? `, señal: ${signal}` : ""}` });
        }
      });

      waitForReady("127.0.0.1", assignment.port, 120_000).then((ready) => {
        if (resolved) return;
        if (!ready) {
          resolved = true;
          resolve({ error: `llama-server (${assignment.role}) no respondio en :${assignment.port} tras 120s` });
          return;
        }
        if (!proc.pid) {
          resolved = true;
          resolve({ error: `llama-server (${assignment.role}) murio justo despues de iniciar` });
          return;
        }
        resolved = true;
        resolve({
          pid: proc.pid,
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
