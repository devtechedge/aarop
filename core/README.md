# 🧠 AAROP — Autonomous Agentic Reasoning & Orchestration Platform

> A reference implementation of a **multi-agent system built on agentic-loop engineering principles**: `Perceive → Plan → Act → Observe → Reflect → Adapt`. The loop is implemented as an **explicit, inspectable state machine** — not a hidden prompt chain — with bounded autonomy, self-verification, durable checkpointing, and full trace replay.

<p align="left">
  <img alt="python" src="https://img.shields.io/badge/python-3.10%2B-blue">
  <img alt="tests" src="https://img.shields.io/badge/tests-24%20passing-brightgreen">
  <img alt="coverage" src="https://img.shields.io/badge/coverage-99%25-brightgreen">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-black">
</p>

---

## ✨ Why this project exists

Most "AI agent" demos hide their control flow inside one giant prompt and break the moment a tool fails or a model hallucinates. AAROP demonstrates how a **senior/architect-level** agent system is actually engineered: the agentic loop is a first-class state machine, every tool call is schema-validated and sandboxed, every run is budgeted, verified by a critic, and fully replayable from a structured trace.

**It runs 100% offline with zero API keys** (a deterministic `MockProvider` stands in for the LLM), so anyone can clone and run it in seconds — while every backend (model, tools, memory) is pluggable for real deployment.

## 🎬 Quickstart (30 seconds, no API keys)

```bash
git clone https://github.com/devtechedge/aarop && cd aarop/core
pip install -e ".[dev]"

# Run the full agentic loop end-to-end
python examples/run_demo.py --objective "calculate 21*2 + 8" --verbose

# Run the test suite (24 tests, 99% coverage on core logic)
pytest --cov=aarop
```

**Expected output:**
```
Phase trace: plan -> act -> observe -> reflect -> done
result: "50"   confidence: 0.9   trace events: 18
```

## 🔁 The Agentic Loop (the heart of the system)

```
        ┌──────────┐
        │ PERCEIVE │  normalize input + RAG/memory recall
        └────┬─────┘
             ▼
        ┌──────────┐
        │   PLAN   │  cost-aware hierarchical task graph
        └────┬─────┘
             ▼
        ┌──────────┐
        │   ACT    │  schema-validated, sandboxed tool calls
        └────┬─────┘
             ▼
        ┌──────────┐
        │ OBSERVE  │  capture results + detect anomalies
        └────┬─────┘
             ▼
        ┌──────────┐      accepted
        │ REFLECT  │───────────────► DONE ✅ (commit to memory)
        └────┬─────┘
             │ rejected
             ▼
        ┌──────────┐  replan / retry / escalate to human
        │  ADAPT   │──► (budget exhausted) ──► ESCALATED 🚨
        └────┬─────┘
             └──► back to PLAN / PERCEIVE
```

Every transition emits a structured trace event (`phase_transition`, `tool_call`, `loop_complete`) so a run can be **reconstructed and replayed deterministically**.

## 🏗️ Architecture

| Module | Responsibility |
|---|---|
| `core/loop.py` | The agentic loop state machine + `Budget` (bounded autonomy) + checkpointing |
| `agents/agents.py` | `Planner`, `Actor`, `Verifier/Critic` — the pluggable loop dependencies |
| `tools/registry.py` | Schema-validated tool registry, permission scopes, retries, **circuit breaker**, audit log |
| `memory/store.py` | Working / episodic / semantic memory + RAG-style recall + consolidation |
| `routing/model_router.py` | Cost-aware model routing across cloud + self-hosted providers |
| `observability/tracing.py` | Structured span/event tracing (OpenTelemetry-shaped) with replay buffer |

```
API/Gateway → Orchestrator (Agentic Loop) → { Worker Agents, Tool Registry,
              Memory Service, Model Router } → Observability + Eval + FinOps
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for C4-style diagrams, the production reference stack (Temporal, FastAPI, pgvector, vLLM, K8s, OpenTelemetry), and **ADRs** documenting key trade-offs.

## 🛡️ Engineering rigor demonstrated

- **Bounded autonomy** — every run respects step / cost / time budgets and escalates instead of looping forever.
- **Self-verification** — a critic agent scores every result against acceptance criteria before commit.
- **Resilience** — tool retries, circuit breaker, anomaly detection in the observe phase.
- **Security posture** — permission-scoped tools, input validation, sandboxed-charset evaluator, audit logging.
- **Observability** — full structured trace per run; deterministic replay.
- **Testability** — 99% coverage on core orchestration; all dependencies injected/mockable.

## 🗺️ From demo to production

This repo is the **reference core**. The [architecture doc](docs/ARCHITECTURE.md) maps each demo component to its production counterpart (e.g. `MockProvider` → vLLM/OpenAI, in-memory store → pgvector/Qdrant, tracing shim → OpenTelemetry + Langfuse, the loop → a Temporal durable workflow). The full system specification lives in [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md).

## 📂 Project layout

```
aarop/
├── src/aarop/{core,agents,tools,memory,routing,observability}/
├── examples/run_demo.py        # end-to-end runnable demo
├── tests/test_loop.py          # 24 unit tests, 99% core coverage
├── docs/{ARCHITECTURE.md,PROJECT_SPEC.md}
└── pyproject.toml
```

## 📜 License

MIT © 2026 Devayan Mandal — see [LICENSE](LICENSE).
