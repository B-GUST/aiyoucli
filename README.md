# aiyoucli

AI agent CLI with Rust-powered vector intelligence. Zero dependencies. Sub-millisecond operations.

[![npm version](https://img.shields.io/npm/v/@aiyou-dev/cli)](https://www.npmjs.com/package/@aiyou-dev/cli)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![build](https://github.com/faugustdev/aiyoucli/actions/workflows/ci.yml/badge.svg)](https://github.com/faugustdev/aiyoucli/actions/workflows/ci.yml)
[![platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Linux%20%7C%20Windows-brightgreen)](https://www.npmjs.com/package/@aiyou-dev/cli)

---

## Why aiyoucli?

- **65x smaller** than comparable tools -- 6,441 lines of code vs 416,834. Every line earns its place.
- **Zero runtime dependencies.** A single NAPI binary handles vector search, neural learning, graph traversal, and code analysis. No node_modules tree at runtime.
- **Sub-millisecond Rust engines.** Task routing in 0.04ms. Neural learning in 0.18ms. HNSW vector search with SIMD acceleration.
- **24 CLI commands + 84 MCP tools.** Full AI agent orchestration from the terminal or through any MCP-compatible client.

## Quick Start

```sh
npm install -g @aiyou-dev/cli
```

Initialize a project:

```sh
aiyoucli init
```

## Features

| Category | What it does |
|----------|-------------|
| **Rust NAPI Engines** | 8 native engines -- HNSW vector search, SONA neural learning, attention routing, graph knowledge, code analysis, technology detection, TOON distillation, task routing. All compiled to a single `.node` binary. |
| **MCP Server** | 84 tools exposed via Model Context Protocol for AI agent orchestration. Drop into Claude Code, Cursor, or any MCP client. |
| **Multi-Agent Orchestration** | Spawn agents, manage swarms across 5 topologies (hierarchical, mesh, ring, star, hybrid), route tasks to optimal model tiers. |
| **Vector Memory** | Persistent HNSW vector database with SIMD-accelerated similarity search. Store, query, and manage embeddings locally. |
| **Neural Learning (SONA)** | MicroLoRA adapters with EWC++ consolidation. Continuous learning without catastrophic forgetting. |
| **TOON Distillation** | Convert Markdown instructions to dense structured format. 52% fewer tokens with no information loss. |
| **Technology Detection** | Auto-detect 45+ technologies, frameworks, and tools in any project directory. |
| **Deep Research** | Multi-engine web research (arXiv, PubMed, Semantic Scholar, Wikipedia, SearXNG) with strategy-driven orchestration, document processing, and knowledge graphs. |
| **Local LLM Proxy** | Built-in proxy gateway for local GGUF models with shield, compression, caching, segmentation, and cost tracking. |
| **Model Management** | Scan GGUF models, analyze quantization levels, get Unsloth Dynamic v2.0 upgrade recommendations. |
| **Production Hardening** | Circuit breakers, rate limiters, retry with exponential backoff, health diagnostics, cost tracking. |

## CLI Commands

### Core

| Command | Description |
|---------|-------------|
| `init` | Initialize project -- generates AGENTS.md, settings, and skills |
| `status` | System status overview |
| `doctor` | Health diagnostics and environment checks |
| `config` | Get or set configuration values |

### Agents and Orchestration

| Command | Description |
|---------|-------------|
| `agent` | Agent lifecycle -- spawn, list, status, stop, record, metrics |
| `swarm` | Swarm coordination -- init, status, stop |
| `task` | Task management -- create, list, status, complete |
| `session` | Session lifecycle -- start, end, list |
| `route` | AI-powered task routing to optimal model tiers |
| `hooks` | Lifecycle hooks -- route, pre-task, post-task, stats |

### Intelligence

| Command | Description |
|---------|-------------|
| `memory` | Vector memory -- init, store, search, list, stats, delete |
| `neural` | Neural training -- observe, learn, stats |
| `analyze` | Code analysis -- diff, commit, complexity |
| `security` | Security scanning |
| `performance` | Benchmarking suite |

### Local AI

| Command | Description |
|---------|-------------|
| `models` | GGUF model management -- list, optimize recommendations |
| `rd` | Deep research -- init, search, strategies, status, report, doc |
| `route` | Task-to-agent routing with Q-learning + model tier selection |

### Utilities

| Command | Description |
|---------|-------------|
| `skills` | Manage project skills -- sync, list, detect |
| `gcc` | Git context extraction |
| `statusline` | Rich status dashboard |
| `completions` | Shell completions for bash and zsh |
| `mcp` | MCP server management -- start, status, tools |

---

## Usage Guide

### Multi-Agent with Local Models

aiyoucli lets you run a multi-agent system entirely on your local machine using GGUF models via the proxy gateway.

#### 1. Start the LLM Proxy Gateway

Run any llama.cpp-compatible server on port 8000:

```sh
# Example with llama-server
llama-server -m models/my-model.Q4_K_M.gguf --port 8000 --host 127.0.0.1
```

Or use any OpenAI-compatible API endpoint by configuring the base URL:

```sh
aiyoucli config set llm.base_url http://127.0.0.1:8000/v1
```

#### 2. Spawn Agents

Agents are lightweight state trackers. Each agent has a type, name, assigned model tier, and metrics:

```sh
# Spawn a coder agent (default: sonnet-tier)
aiyoucli agent spawn --type coder --name worker-1

# Spawn an architect agent using opus-tier logic
aiyoucli agent spawn --type architect --model opus

# Spawn a lightweight tester agent (haiku-tier)
aiyoucli agent spawn --type tester

# Spawn a researcher agent for information gathering
aiyoucli agent spawn --type researcher --name research-1
```

**Agent types and their default model tiers:**

| Type | Default Model | Best For |
|------|--------------|----------|
| `coder` | sonnet | Code generation and editing |
| `researcher` | sonnet | Information gathering and analysis |
| `tester` | haiku | Test writing and validation |
| `reviewer` | sonnet | Code review and feedback |
| `architect` | opus | System design and architecture |
| `security` | opus | Security audit and vulnerability detection |
| `debugger` | sonnet | Bug hunting and root cause analysis |
| `documenter` | haiku | Documentation generation |

The spawned agents are recorded in `.aiyoucli/agents/store.json` and can be listed, stopped, or queried at any time.

#### 3. Initialize a Swarm

A swarm coordinates multiple agents together. Choose a topology that matches your workflow:

```sh
# Hierarchical: one coordinator delegates to workers (good for complex tasks)
aiyoucli swarm init --topology hierarchical --maxAgents 5 --strategy specialized

# Mesh: all agents collaborate peer-to-peer (good for research)
aiyoucli swarm init --topology mesh --maxAgents 8 --strategy balanced

# Star: central hub routes to specialized leaves (good for service architectures)
aiyoucli swarm init --topology star --strategy adaptive
```

**Topology comparison:**

| Topology | Structure | Use Case |
|----------|-----------|----------|
| `hierarchical` | Manager → Workers | Complex tasks with decomposition |
| `mesh` | Peer-to-peer | Collaborative research, brainstorming |
| `ring` | Sequential chain | Pipeline processing |
| `star` | Hub → Spokes | Centralized orchestration |
| `hybrid` | Mixed | Custom architectures |

**Strategy options:**

| Strategy | Behavior |
|----------|----------|
| `specialized` | Each agent is assigned tasks matching its type |
| `balanced` | Tasks are distributed evenly based on load |
| `adaptive` | Agent roles adjust dynamically based on performance metrics |

#### 4. Route Tasks

Use the Q-learning router to send tasks to the optimal agent:

```sh
# Route a task description to the best agent type
aiyoucli route --task "implement user authentication with JWT"

# Select the optimal model tier for a task
aiyoucli hooks model-route --task "analyze this security vulnerability"
```

The router learns from outcomes via `hooks post-task` and persists its Q-table to `.aiyoucli/q-table.json`.

#### 5. Check Status

```sh
# View all agents
aiyoucli agent list

# View swarm state
aiyoucli swarm status

# Full coordination overview
aiyoucli coordination status

# Rich dashboard
aiyoucli statusline
```

### Deep Research

The `rd` command provides multi-engine web research with strategy-driven orchestration.

```sh
# Initialize a research session
aiyoucli rd init --query "Rust async runtime comparison: tokio vs smol vs monoio" --strategy langgraph-agent

# Search across academic engines
aiyoucli rd search --query "async Rust performance benchmarks" --engine arxiv
aiyoucli rd search --query "tokio scheduler overhead" --engine semantic-scholar

# List available strategies
aiyoucli rd strategies

# Check session progress
aiyoucli rd status --session-id rd_xxxx

# Generate a research report
aiyoucli rd report --session-id rd_xxxx --format markdown

# Queue a document for processing (PDF/DOCX/image)
aiyoucli rd doc --path paper.pdf
aiyoucli rd doc --path scanned-doc.pdf --ocr
```

**Research strategies available:**

| Strategy | Description |
|----------|-------------|
| `langgraph-agent` | Autonomous agentic research: the LLM decides what to search, which engines to use, and when to synthesize findings |
| `source-based` | Focused source extraction with cross-engine filtering and deduplication |
| `focused-iteration` | Iterative deep-dive with adaptive sub-questions and progressive knowledge summation |
| `topic-organization` | Structured output organized by topic clusters with hierarchical findings |
| `quick` | Fast single-pass research summary (30s-3min) for quick answers |

**Search engines:**

| Engine | Type | Endpoint |
|--------|------|----------|
| `searxng` | General web search | localhost:8080 |
| `arxiv` | Academic papers (CS, physics, math) | export.arxiv.org |
| `pubmed` | Biomedical literature | ncbi.nlm.nih.gov |
| `semantic-scholar` | Scientific papers (AI/CS focus) | api.semanticscholar.org |
| `wikipedia` | Encyclopedia | en.wikipedia.org |

### Local Model Management

The `models` command scans and analyzes local GGUF files:

```sh
# Scan a directory for GGUF models
aiyoucli models list --path /home/user/models/

# Get Unsloth Dynamic v2.0 optimization recommendation
aiyoucli models optimize --model llama-3.1-8b
```

Output includes:
- File size and quantization level (Q2_K through Q8_0)
- Quantization quality ranking (0-6)
- Unsloth Dynamic v2.0 upgrade path with `huggingface-cli` download commands

### Local LLM Proxy (llmproxy)

The proxy gateway at `http://127.0.0.1:8000/v1` provides an OpenAI-compatible API for local GGUF models with enterprise middleware:

```sh
# Check proxy health
aiyoucli mcp tools  # all proxy tools are available via MCP

# The proxy exposes these capabilities through MCP tools:
# - proxy_chat: Send chat completions to local LLM
# - proxy_embed: Generate text embeddings
# - proxy_compress: Compress context windows
# - proxy_shield_check: Content safety filtering
# - proxy_list_models: Available model listing
# - proxy_estimate_cost: Token cost estimation
# - proxy_analyze_text: Text analysis and compression
# - proxy_segment: Text segmentation/chunking
```

The proxy is designed to run alongside any llama.cpp-compatible server. It adds:
- **Shield**: Prompt injection detection, blocked keyword filtering, high-entropy detection
- **Compression**: Smart context pruning and message truncation
- **Caching**: Response cache to avoid redundant inference
- **Segmentation**: Text splitting by chunks or sentences with overlap
- **Embeddings**: Integration with local ONNX embedding server (port 8001)

For a detailed guide on setting up local/hybrid models, Wake-on-Request routing, VRAM management, and configuring swarms, see [Local and Hybrid Models Configuration](docs/local-models.md).

### Run as MCP Server

aiyoucli can run as an MCP server for Claude Code, Cursor, or any MCP-compatible client:

```jsonc
// .mcp.json
{
  "mcpServers": {
    "aiyoucli": {
      "command": "npx",
      "args": ["@aiyou-dev/cli", "mcp", "start"]
    }
  }
}
```

Or run directly:

```sh
aiyoucli mcp start
aiyoucli mcp status
aiyoucli mcp tools   # list all 84 available tools
```

## MCP Tools

84 tools organized across 22 categories. All available through any MCP-compatible client.

| Category | Count | Key Tools |
|----------|------:|-----------|
| Deep Research | 8 | rd_init, rd_search, rd_document_process, rd_strategies, rd_status, rd_knowledge_graph, rd_citations, rd_report |
| Metrics and Monitoring | 8 | metrics_snapshot, metrics_cost, metrics_latency, metrics_memory, metrics_record_tokens, metrics_save, metrics_reset, metrics_tools_summary |
| Agent Management | 6 | agent_spawn, agent_list, agent_status, agent_stop, agent_record, agent_metrics |
| Vector Memory | 6 | memory_init, memory_store, memory_search, memory_stats, memory_count, memory_delete |
| Proxy Gateway | 10 | proxy_chat, proxy_health, proxy_shield_check, proxy_compress, proxy_analyze_text, proxy_segment, proxy_list_models, proxy_estimate_cost, proxy_embed, proxy_cache_stats |
| Semantic Router | 5 | semantic_route, semantic_route_hybrid, semantic_route_enhanced, semantic_embed, semantic_stats |
| Hooks and Lifecycle | 5 | hooks_route, hooks_model_route, hooks_pre_task, hooks_post_task, hooks_stats |
| Neural Learning | 4 | neural_observe, neural_learn, neural_stats, neural_transform |
| Task Management | 4 | task_create, task_list, task_status, task_complete |
| Code Analysis | 3 | analyze_diff, analyze_commit, analyze_complexity |
| Session | 3 | session_start, session_end, session_list |
| Swarm | 3 | swarm_init, swarm_status, swarm_stop |
| AST Analysis | 3 | ast_analyze, ast_analyze_batch, ast_detect_language |
| Skills | 3 | skills_sync, skills_list, skills_detect |
| Models | 2 | models_list, models_optimize |
| Distiller | 2 | distill_markdown, distill_file |
| Config | 2 | config_get, config_set |
| System | 2 | system_status, system_doctor |
| Other | 5 | perf_benchmark, security_scan, coordination_status, git_context, statusline |

## Architecture

```
+----------------------------------------------------------+
|                      CLI / MCP Server                     |
|                       (TypeScript)                        |
|  24 commands    84 MCP tools    production middleware      |
+---------------------------+------------------------------+
                            |
                      NAPI Bridge
                            |
+---------------------------v------------------------------+
|                     Rust Engines                          |
|                                                           |
|  vector.rs    - HNSW vector search, SIMD acceleration     |
|  sona.rs      - MicroLoRA + EWC++ neural learning         |
|  attention.rs - Flash attention, agent coordination        |
|  routing.rs   - Task routing, model tier selection         |
|  graph.rs     - Knowledge graph, k-hop traversal          |
|  analysis.rs  - Code complexity, diff analysis             |
|  detector.rs  - Technology detection (45+ frameworks)      |
|  distiller.rs - TOON markdown distillation                 |
|  proxy/       - LLM gateway, shield, compression, cache    |
|  semantic/    - Keyword + embedding hybrid routing         |
+----------------------------------------------------------+
```

TypeScript handles CLI parsing, MCP protocol, and production middleware (circuit breakers, rate limiting, retries). All compute-intensive work crosses the NAPI bridge into Rust, where operations complete in microseconds to low milliseconds.

## Configuration

Configuration is stored per-project in `.aiyoucli/` and managed through the CLI or MCP tools.

```sh
# Set a value
aiyoucli config set memory.dimensions 384

# Read a value
aiyoucli config get memory.dimensions
```

Key configuration areas:

- **Model routing** -- default model, tier thresholds, fallback behavior
- **Memory** -- vector dimensions, similarity metric, persistence path
- **Production** -- circuit breaker thresholds, rate limits, retry policy
- **Skills** -- detected technologies, custom skill definitions
- **LLM proxy** -- base URL, model name, provider type

## Performance

Benchmarked on Apple M-series. All operations run in-process with no network calls.

| Operation | Avg Latency | Ops/sec |
|-----------|------------:|--------:|
| Model tier selection | 0.04ms | 23,923 |
| Graph k-hop (100 nodes) | 0.08ms | 13,158 |
| Task routing | 0.11ms | 8,718 |
| Complexity analysis | 0.15ms | 6,631 |
| Neural learn | 0.18ms | 5,445 |
| Neural observe | 0.42ms | 2,398 |
| Vector insert (3D) | 1.87ms | 534 |
| Vector search (100 vectors) | 3.36ms | 297 |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Install dependencies: `npm install`
4. Build: `npm run build` (requires Rust toolchain for NAPI)
5. Run tests: `npm test`
6. Submit a pull request

The build has two stages: `build:rs` compiles the Rust NAPI binary, and `build:ts` compiles TypeScript. You need a working Rust toolchain (stable) to build from source.

## License

MIT. See [LICENSE](LICENSE) for details.

---

Built by [Francisco August](https://github.com/faugustdev).
