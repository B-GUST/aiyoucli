# Plan: Dynamic Local Model Engine

## Goal
`aiyoucli models start` — interactive tool that orchestrates MinIO download, VRAM validation, llama-server lifecycle, and opencode config integration.

## Defaults
- **Central model**: `gemma-4-E2B-it-qat-UD-Q4_K_XL.gguf` (2.5GB, ~2.8GB VRAM)
- **Ports**: 8000 central, 8001 executor, 8002 auditor
- **MinIO**: `bgust-minio` at `http://127.0.0.1:9000`, bucket `llm-models`, creds `minioadmin/minioadmin`
- **GPU**: RTX 4050 6GB (~5.6GB free)
- **Skip download**: if GGUF exists in `~/.aiyoucli/models/`, skip MinIO download

## Implementation order
1. `src/models/types.ts` — types (WorkMode, ModelRole, ModelAssignment, etc.)
2. `src/models/vram.ts` — GPU detection + VRAM table + validation
3. `src/models/minio.ts` — health check + list + download with skip
4. `src/models/launcher.ts` — spawn/kill llama-server processes
5. `src/models/manager.ts` — interactive orchestrator
6. `src/mcp/tools/model-engine-tools.ts` — MCP tools (start/stop/status)
7. `src/commands/index.ts` — CLI subcommands
8. `src/types.ts` + `src/config.ts` — config extensions
9. `src/init/opencode-config.ts` — opencode config updater
10. Tests

## Work modes
- **uni-model**: 1 model (central, port 8000)
- **dual-model**: central + executor (8000, 8001)
- **tree-model**: central + executor + auditor (8000, 8001, 8002)

## VRAM validation
Auto-detect via nvidia-smi. Table lookup per model+quant. Reject combinations > free VRAM. Suggest alternatives.
