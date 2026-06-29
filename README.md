# 🧠 AAROP — Autonomous Agentic Reasoning & Orchestration Platform

> A reference implementation of a **multi-agent AI system built on agentic-loop engineering principles**: `Perceive → Plan → Act → Observe → Reflect → Adapt`. The loop is an **explicit, inspectable state machine** — not a hidden prompt chain — with bounded autonomy, self-verification, durable checkpointing, and full trace replay.

<p align="left">
  <img alt="python" src="https://img.shields.io/badge/python-3.10%2B-blue">
  <img alt="next" src="https://img.shields.io/badge/Next.js-14-black">
  <img alt="tests" src="https://img.shields.io/badge/tests-9%20passing-brightgreen">
  <img alt="coverage" src="https://img.shields.io/badge/coverage-92%25-brightgreen">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-black">
</p>

**Built by [Devayan Mandal](https://github.com/devtechedge)** — AI / ML Engineer.

---

## 🎯 What's in this repository

| Path | What it is |
|---|---|
| **[`core/`](core/)** | The Python reference engine — the agentic loop, agents, tool registry, memory, model router, observability. **9 tests, 92% coverage. Runs offline, no API keys.** |
| **[`web-demo/`](web-demo/)** | A **Next.js live demo** that animates the full agentic loop in the browser. Deploys to Vercel free tier. |
| **[`docs/AAROP_Case_Study.pdf`](docs/AAROP_Case_Study.pdf)** | A polished 4-page case study (problem → architecture → results → ADRs). |

## 🔁 The Agentic Loop

```
PERCEIVE → PLAN → ACT → OBSERVE → REFLECT ──accept──► DONE ✅
   ▲                                  │
   └──────────── ADAPT ◄──────reject──┘   (budget exhausted → ESCALATE 🚨)
```

Every phase transition emits a structured trace event, so any run is fully reconstructable and replayable. Every run respects step / cost / time budgets and escalates to a human instead of looping forever.

## ⚡ Quickstart

**Core engine (Python):**
```bash
cd core
pip install -e ".[dev]"
python examples/run_demo.py --objective "calculate 21*2 + 8" --verbose
pytest --cov=aarop
```

**Live demo (Next.js):**
```bash
cd web-demo
npm install
npm run dev   # http://localhost:3000
```

## 🏗️ Architecture & engineering rigor

- **Explicit loop state machine** — observable, replayable, crash-recoverable
- **Bounded autonomy** — step/cost/time budgets with human escalation
- **Self-verification** — a critic agent gates every result before commit
- **Resilient tooling** — schema-validated, permission-scoped, retries + circuit breaker + audit log
- **Cost-aware model routing** — cloud + self-hosted, pluggable
- **Observability** — structured trace per run (OpenTelemetry-shaped)
- **92% test coverage** on core orchestration; CI across Python 3.10–3.12

See **[`core/docs/ARCHITECTURE.md`](core/docs/ARCHITECTURE.md)** for C4 diagrams, the production reference stack (Temporal, FastAPI, pgvector, vLLM, Kubernetes, OpenTelemetry), and **5 Architecture Decision Records**. The full specification is in **[`core/docs/PROJECT_SPEC.md`](core/docs/PROJECT_SPEC.md)**.

## 🌐 Live demo

The `web-demo/` is designed for one-click Vercel deployment (free Hobby tier). It ports the exact loop logic to TypeScript and runs **100% client-side** with a deterministic mock provider — instant, free, and always online. See [`web-demo/README.md`](web-demo/README.md) for deploy steps.

## 📜 License

MIT © 2026 Devayan Mandal — see [`core/LICENSE`](core/LICENSE).
