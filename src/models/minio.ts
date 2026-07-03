import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const MINIO_URL = "http://127.0.0.1:9000";
const MINIO_CONTAINER = "bgust-minio";
const MINIO_BUCKET = "llm-models";
const MODELS_DIR = join(homedir(), ".aiyoucli", "models");

export function getModelsDir(): string {
  if (!existsSync(MODELS_DIR)) {
    mkdirSync(MODELS_DIR, { recursive: true });
  }
  return MODELS_DIR;
}

export function checkMinioHealth(): { ok: boolean; message: string } {
  try {
    const code = execSync(
      `curl -s -o /dev/null -w "%{http_code}" ${MINIO_URL}/minio/health/live`,
      { encoding: "utf-8", timeout: 5000 }
    ).trim();
    if (code === "200") {
      return { ok: true, message: `MinIO activo en ${MINIO_URL}` };
    }
    return { ok: false, message: `MinIO respondio con codigo ${code}` };
  } catch {
    return {
      ok: false,
      message: `No se pudo conectar a MinIO en ${MINIO_URL}. Asegurate de que el contenedor ${MINIO_CONTAINER} este corriendo.`,
    };
  }
}

export function listModelsInBucket(): string[] {
  try {
    const out = execSync(
      `docker exec ${MINIO_CONTAINER} ls /data/${MINIO_BUCKET}/`,
      { encoding: "utf-8", timeout: 10000 }
    ).trim();
    return out.split("\n").filter((f) => f.endsWith(".gguf")).sort();
  } catch {
    return [];
  }
}

export function downloadModel(modelFile: string): { ok: boolean; path: string; message: string } {
  const destDir = getModelsDir();
  const destPath = join(destDir, modelFile);

  if (existsSync(destPath)) {
    return { ok: true, path: destPath, message: `Ya existe localmente: ${modelFile}` };
  }

  try {
    execSync(
      `docker cp ${MINIO_CONTAINER}:/data/${MINIO_BUCKET}/${modelFile} "${destPath}"`,
      { timeout: 300000, stdio: "pipe" }
    );
    return { ok: true, path: destPath, message: `Descargado: ${modelFile}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, path: "", message: `Error descargando ${modelFile}: ${msg}` };
  }
}

export function batchDownload(models: string[]): { ok: boolean; results: string[] } {
  const results: string[] = [];
  for (const m of models) {
    const r = downloadModel(m);
    results.push(r.message);
    if (!r.ok) return { ok: false, results };
  }
  return { ok: true, results };
}
