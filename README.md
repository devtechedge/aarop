# 🧠 AAROP — Autonomous Agentic Reasoning & Orchestration Platform

> A reference implementation of a **multi-agent AI system built on agentic-loop engineering principles**: `Perceive → Plan → Act → Observe → Reflect → Adapt`. The loop is an **explicit, inspectable state machine** — not a hidden prompt chain — with bounded autonomy, self-verification, durable checkpointing, and full trace replay.

<p align="left">
  <a href="https://aarop.vercel.app/"><img alt="live demo" src="https://img.shields.io/badge/live%20demo-online-brightgreen"></a>
  <a href="https://github.com/devtechedge/aarop/actions"><img alt="ci" src="https://github.com/devtechedge/aarop/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="python" src="https://img.shields.io/badge/python-3.10%2B-blue">
  <img alt="next" src="https://img.shields.io/badge/Next.js-14-black">
  <img alt="tests" src="https://img.shields.io/badge/tests-9%20passing-brightgreen">
  <img alt="coverage" src="https://img.shields.io/badge/coverage-92%25-brightgreen">
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-black"></a>
</p>

### 🌐 [**▶ Try the Live Demo →**](https://aarop.vercel.app/)
Watch an objective flow through the full agentic loop in real time — no install, no API keys, no sign-up.

> **Live demo status:** 100% client-side TypeScript port with a deterministic mock provider — always online on Vercel. The Python `core/` engine runs offline with the same loop semantics (9 tests, 92% coverage).

**Built by [Devayan Mandal](https://github.com/devtechedge)** — AI / ML Engineer.

---

## Screenshots

| Live agentic loop | Multi-agent orchestration |
|-------------------|---------------------------|
| ![Agentic loop](docs/screenshots/01-agentic-loop.png) | ![Multi-agent](docs/screenshots/02-multi-agent.png) |

| System architecture + engineering rigor |
|-----------------------------------------|
| ![Architecture](docs/screenshots/03-architecture.png) |

---

## What's in this repository

| Path | What it is |
|---|---|
| **[`core/`](core/)** | The Python reference engine — the agentic loop, agents, tool registry, memory, model router, observability. **9 tests, 92% coverage. Runs offline, no API keys.** |
| **[`web-demo/`](web-demo/)** | A **Next.js live demo** ([aarop.vercel.app](https://aarop.vercel.app/)) that animates the full agentic loop in the browser. |
| **[`docs/AAROP_Case_Study.pdf`](docs/AAROP_Case_Study.pdf)** | A polished 4-page case study (problem → architecture → results → ADRs). |
| **[`core/docs/ARCHITECTURE.md`](core/docs/ARCHITECTURE.md)** | C4 diagrams, production reference stack, and 5 ADRs. |
| **[`core/docs/PROJECT_SPEC.md`](core/docs/PROJECT_SPEC.md)** | The full chief-architect-level system specification. |

## The Agentic Loop

```
PERCEIVE → PLAN → ACT → OBSERVE → REFLECT ──accept──► DONE
   ▲                                  │
   └──────────── ADAPT ◄──────reject──┘   (budget exhausted → ESCALATE)
```

| Phase | Responsibility |
|---|---|
| **Perceive** | Normalize input + retrieve relevant context / memory (RAG) |
| **Plan** | Build a cost-aware hierarchical task graph |
| **Act** | Invoke schema-validated, sandboxed tools / sub-agents |
| **Observe** | Capture structured results + detect anomalies |
| **Reflect** | Critic verifies output against acceptance criteria |
| **Adapt** | Replan / retry with backoff / escalate to a human |

Every phase transition emits a structured trace event, so any run is fully reconstructable and replayable. Every run respects step / cost / time budgets and escalates instead of looping forever.

## Repository layout

```
aarop/
├── core/                       # Python reference engine (runs offline, 92% tested)
│   ├── src/aarop/
│   │   ├── core/loop.py        # agentic loop state machine + Budget guardrails
│   │   ├── agents/agents.py    # Planner · Actor · Verifier (critic)
│   │   ├── tools/registry.py   # schema-validated tools, scopes, circuit breaker
│   │   ├── memory/store.py     # working / episodic / semantic memory + RAG
│   │   ├── routing/            # cost-aware model router
│   │   └── observability/      # structured tracing + replay
│   ├── examples/run_demo.py
│   ├── tests/test_loop.py
│   └── docs/                   # ARCHITECTURE.md, PROJECT_SPEC.md
├── web-demo/                   # Next.js 14 live demo (Vercel)
│   ├── app/
│   ├── lib/aarop.ts
│   └── public/favicon.svg
├── docs/
│   ├── AAROP_Case_Study.pdf
│   └── screenshots/
├── LICENSE
└── README.md
```

## Quickstart

**Core engine (Python):**
```bash
cd core
pip install -e ".[dev]"
python examples/run_demo.py --objective "calculate 21*2 + 8" --verbose
pytest --cov=aarop          # 9 passed · 92% coverage
```

**Live demo (Next.js):**
```bash
cd web-demo
npm install
npm run dev                 # http://localhost:3000
```

## Architecture & engineering rigor

- **Explicit loop state machine** — observable, replayable, crash-recoverable
- **Bounded autonomy** — step / cost / time budgets with human escalation
- **Self-verification** — a critic agent gates every result before commit
- **Resilient tooling** — schema-validated, permission-scoped, retries + circuit breaker + audit log
- **Cost-aware model routing** — cloud + self-hosted, pluggable
- **Observability** — structured trace per run (OpenTelemetry-shaped)
- **92% test coverage** on core orchestration; CI across Python 3.10–3.12

See **[`core/docs/ARCHITECTURE.md`](core/docs/ARCHITECTURE.md)** for C4 diagrams, the production reference stack (Temporal, FastAPI, pgvector, vLLM, Kubernetes, OpenTelemetry), and **5 Architecture Decision Records**.

## Live demo

The [`web-demo/`](web-demo/) ports the exact loop logic to TypeScript and runs **100% client-side** with a deterministic mock provider — instant, free, and always online. Deployed on Vercel: **[aarop.vercel.app](https://aarop.vercel.app/)**. See [`web-demo/README.md`](web-demo/README.md) for deploy steps.

## Roadmap

- [ ] Pluggable real LLM provider (OpenAI / Anthropic / self-hosted vLLM)
- [ ] Persistent memory backend (pgvector / Qdrant) + cross-encoder reranker
- [ ] Durable workflow execution via Temporal
- [ ] OpenTelemetry exporter + Grafana dashboards
- [ ] "Bring your own API key" toggle in the live demo

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Issues and PRs welcome.

## License

MIT © 2026 Devayan Mandal — see [`LICENSE`](LICENSE).
