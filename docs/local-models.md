# Local and Hybrid Models Configuration

[Home](../README.md) | [Getting Started](getting-started.md) | [CLI Reference](cli-reference.md) | [MCP Tools](mcp-tools.md) | [Architecture](architecture.md) | **Local Models**

---

## 1. Overview

aiyoucli supports running completely offline using local models via `llama-server`. It implements an intelligent **Wake-on-Request** gateway and dynamic **task-mode** routing. 

This configuration is optimized to be **ultra-lightweight** and run smoothly on hardware with resource constraints, such as laptops or systems with GPUs containing 4GB to 6GB of VRAM (e.g. NVIDIA RTX 4050/3050).

---

## 2. Architecture & Work Modes

The system operates in three main tiers of model complexity (Tiers 1, 2, and 3) plus an external cloud tier (Tier 4):

```
+---------------------------------------------------------------------------------+
|                                 aiyoucli Gateway                                |
+---------------------------------------------------------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |          Hook: hooks_pre_task         |
                     +---------------------------------------+
                                         |
                       +-----------------+-----------------+
                       |                                   |
                       v                                   v
             [ Mode: coder ]                      [ Mode: research ]
       (Programming/Code Intention)         (Research/Writing Intention)
                       |                                   |
           +-----------+-----------+           +-----------+-----------+
           |           |           |           |           |           |
           v           v           v           v           v           v
       [Tier 1]    [Tier 2]    [Tier 3]    [Tier 1]    [Tier 2]    [Tier 3]
       Qwen-3B     DS-1.5B +   DS-1.5B +   Llama-3B    DS-1.5B +   DS-1.5B +
                   Qwen-1.5B   Qwen-1.5B +             Llama-3B    Llama-1B +
                               Granite-Tiny                        Granite-Tiny
```

### Work Mode Tiers
1.  **unimodel (Tier 1):** Single model optimized for low-latency tasks.
2.  **dualmodels (Tier 2):** Two models running concurrently (Cerebro + Specialist) for moderate-complexity tasks.
3.  **treemodels (Tier 3):** Three models running concurrently (Cerebro + Specialist + Auditor) for complex agentic workflows.
4.  **opencode_gateway (Tier 4):** Cloud-delegated reasoning for highly complex architecture tasks.

---

## 3. Configuration (`aiyoucli.config.json`)

Configure your project-specific `aiyoucli.config.json` or `.aiyoucli/config.json` to define the ports and models mapped to each tier and task mode:

```json
{
  "version": "0.1.0",
  "llm": {
    "active": "local_nlproxy",
    "local_nlproxy": {
      "base_url": "http://127.0.0.1:9000/v1"
    }
  },
  "routing": {
    "default_mode": "coder",
    "modes": {
      "coder": {
        "unimodel": {
          "ports": [8080],
          "models": ["qwen2.5-coder-3b-instruct-q4_k_m.gguf"]
        },
        "dualmodels": {
          "ports": [8080, 8081],
          "models": [
            "DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf",
            "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf"
          ]
        },
        "treemodels": {
          "ports": [8080, 8081, 8082],
          "models": [
            "DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf",
            "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
            "granite-4.0-h-tiny-Q4_K_M.gguf"
          ]
        }
      },
      "research": {
        "unimodel": {
          "ports": [8080],
          "models": ["Llama-3.2-3B-Instruct-Q4_K_M.gguf"]
        },
        "dualmodels": {
          "ports": [8080, 8081],
          "models": [
            "DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf",
            "Llama-3.2-3B-Instruct-Q4_K_M.gguf"
          ]
        },
        "treemodels": {
          "ports": [8080, 8081, 8082],
          "models": [
            "DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf",
            "Llama-3.2-1B-Instruct-Q4_K_M.gguf",
            "granite-4.0-h-tiny-Q4_K_M.gguf"
          ]
        }
      }
    }
  }
}
```

---

## 4. How the "Wake-on-Request" Gateway Works

The local gateway is implemented inside the **`pre_task` hook** of aiyoucli. It requires zero persistent memory footprint because the model servers are launched only when a task is dispatched:

1.  **Task Classification:** Upon receiving a task, the hook analyzes the description via keywords (e.g. checking for "code", "implement" vs "report", "redact", "article"). It categorizes the intent as either `coder` or `research`.
2.  **Tier Selection:** The NAPI-based `RoutingEngine` decides the recommended tier (unimodel, dualmodels, or treemodels) based on complexity scoring.
3.  **Port Probing:** The hook checks if the ports assigned to that combination are active.
4.  **Auto-Launcher:** If any port is inactive:
    *   It stops any conflicting `llama-server` instances.
    *   It spawns the corresponding script `scripts/<tier>.sh <mode>` in the background.
    *   It polls the endpoints until they respond with HTTP `200 OK` (timeout 30s) before routing the query.

---

## 5. VRAM & Hardware Optimization

To run 3 models simultaneously in 5GB of VRAM:
*   **Context Window Limitation (`-c 2048`):** Restricting the context window prevents the dynamic KV Cache from expanding and causing Out-Of-Memory (OOM) GPU crashes.
*   **Layer Offloading (`-ngl 99`):** Forces all model layers to reside in GPU memory for fast inference.
*   **Flash Attention (`--flash-attn`):** Compresses the VRAM footprint of the KV Cache by up to 50%.
*   **Quantization:** Use standard `Q4_K_M` GGUF files to maximize the parameter count vs memory usage ratio.

---

## 6. Swarm and Agents Usage

Once local models are running, aiyoucli routes swarm commands seamlessly.

### Spawning a Swarm
```bash
# Initialize a hierarchical swarm targeting llmproxy
aiyoucli swarm init --topology hierarchical --maxAgents 5 --strategy specialized
```

### Spawning a Coder Agent
```bash
# Spawn a specialized local coder
aiyoucli agent spawn --type coder --model local-fallback
```

### Dispatching Tasks
```bash
# The pre_task hook automatically wakes up the models and routes the task
aiyoucli task create --description "Write a React component for image display"
```
