# AGENTS.md — aiyoucli

AI agent CLI with Rust-powered vector intelligence

## Build & Run

```bash
# Build
npm run build   # npm run build:rs && npm run build:ts

# Dev
npm run dev     # tsc --watch

# Test
npm test        # vitest run

# Lint
npm run lint    # eslint src/
```

## Code Style

- TypeScript strict mode, ES2022 target
- Use `node:` protocol for built-in imports (`import { readFileSync } from "node:fs"`)
- Prefer `const` over `let`; avoid `var`
- Use explicit return types on exported functions
- Keep files under 500 lines
- Use meaningful names; avoid abbreviations
- Handle errors explicitly — no silent `catch {}` blocks in production paths

## Agent Instructions

### Memory

Store and retrieve knowledge across sessions using aiyoucli memory tools:
- `memory_store` — persist key-value pairs with optional namespace and tags
- `memory_search` — semantic search across stored knowledge
- `memory_retrieve` — fetch a specific key

### Hooks

Lifecycle hooks for task orchestration:
- `hooks_pre_task` — run before starting a task (validation, context loading)
- `hooks_post_task` — run after task completion (cleanup, learning storage)
- `hooks_route` — determine which model tier handles a task

### Routing

3-tier model routing for cost/latency optimization:
| Tier | Handler | Use Case |
|------|---------|----------|
| 1 | WASM Agent Booster | Simple transforms (<1ms, $0) |
| 2 | Fast model | Low-complexity tasks |
| 3 | Reasoning model | Architecture, security, complex logic |

## Available MCP Tools

| Category | Tools |
|----------|-------|
| Memory | store, search, retrieve, list, delete |
| Agent | spawn, list, terminate, status |
| Swarm | init, status, scale, terminate |
| Task | create, list, status, cancel |
| Session | start, resume, list, end |
| Hooks | pre-task, post-task, route, worker list |
| Config | get, set, reset |
| System | health, version, doctor |
| Analyze | code, dependencies, complexity |
| Neural | embed, similarity, cluster |
| Security | scan, audit, validate |
| Performance | profile, benchmark, optimize |
| Coordination | consensus, broadcast, sync |

## Conventions

- Configuration lives in `aiyoucli.config.json` or `.aiyoucli/config.json`
- Memory is stored in `.aiyoucli/memory/` by default
- Never commit secrets, `.env` files, or API keys
- Validate all inputs at system boundaries
- Run tests after code changes; verify build before committing
