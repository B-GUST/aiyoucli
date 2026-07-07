#!/usr/bin/env bash
MODE=${1:-coder}
MODELS_DIR="$HOME/.aiyoucli/models"

if [ "$MODE" = "research" ]; then
  MODEL_2="Llama-3.2-3B-Instruct-Q4_K_M.gguf"
else
  MODEL_2="qwen2.5-coder-1.5b-instruct-q4_k_m.gguf"
fi

# Instancia 1: Cerebro / DeepSeek-R1 (Puerto 8080)
llama-server \
  --port 8080 \
  -m "$MODELS_DIR/DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf" \
  -c 2048 \
  -ngl 99 \
  --flash-attn \
  --host 127.0.0.1 &

# Instancia 2: Especialista (Puerto 8081)
llama-server \
  --port 8081 \
  -m "$MODELS_DIR/$MODEL_2" \
  -c 2048 \
  -ngl 99 \
  --flash-attn \
  --host 127.0.0.1 &

wait
