import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const MINIO_URL = "http://127.0.0.1:9000";
const MINIO_CONTAINER = "bgust-minio";
const MINIO_BUCKET = "llm-models";
const MINIO_ACCESS_KEY = "minioadmin";
const MINIO_SECRET_KEY = "minioadmin";
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

export function getFileSizeInBucket(modelFile: string): number {
  try {
    const out = execSync(
      `docker exec ${MINIO_CONTAINER} du -sb /data/${MINIO_BUCKET}/${modelFile} 2>/dev/null | cut -f1`,
      { encoding: "utf-8", timeout: 10000 }
    ).trim();
    return parseInt(out, 10) || 0;
  } catch {
    return 0;
  }
}

export function downloadModel(modelFile: string): { ok: boolean; path: string; message: string } {
  const destDir = getModelsDir();
  const destPath = join(destDir, modelFile);

  if (existsSync(destPath)) {
    const isFile = execSync(`test -f "${destPath}" && echo "file" || echo "not"`, {
      encoding: "utf-8", timeout: 3000
    }).trim();
    if (isFile === "file") {
      return { ok: true, path: destPath, message: `Ya existe localmente: ${modelFile}` };
    }
    // Remove stale directory artifact from previous docker cp
    try {
      execSync(`rm -rf "${destPath}"`, { timeout: 5000 });
    } catch {
      return { ok: false, path: "", message: `No se pudo limpiar el directorio corrupto: ${modelFile}` };
    }
  }

  const tmpPath = `${destPath}.tmp`;
  try {
    execSync(
      `curl --aws-sigv4 "aws:amz:us-east-1:s3" --user "${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}" "http://127.0.0.1:9000/${MINIO_BUCKET}/${modelFile}" -o "${tmpPath}" 2>/dev/null`,
      { timeout: 600000, stdio: "pipe" }
    );
    execSync(`mv "${tmpPath}" "${destPath}"`, { timeout: 5000 });
    return { ok: true, path: destPath, message: `Descargado: ${modelFile}` };
  } catch (err) {
    try { execSync(`rm -f "${tmpPath}"`, { timeout: 3000 }); } catch { /* cleanup */ }
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
