#!/usr/bin/env bash
MODE=${1:-coder}
MODELS_DIR="/home/august/.aiyoucli/models"

if [ "$MODE" = "research" ]; then
  MODEL="Llama-3.2-3B-Instruct-Q4_K_M.gguf"
else
  MODEL="qwen2.5-coder-3b-instruct-q4_k_m.gguf"
fi

llama-server \
  --port 8080 \
  -m "$MODELS_DIR/$MODEL" \
  -c 4096 \
  -ngl 99 \
  --flash-attn \
  --host 127.0.0.1
