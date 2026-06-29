# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.2.0] — 2026-06-29

### Added
- **Multi-agent orchestration view** — Orchestrator delegates to Researcher / Coder / Analyst / Verifier / Memory worker agents, visualized live.
- **Multi-step plans** — research/design objectives chain multiple tools across agents and synthesize a result.
- **Resilience scenario** — failure injection demonstrates retries, circuit breaker, and escalation.
- **Budget-exhaustion scenario** — demonstrates bounded autonomy escalating to a human.
- **Interactive system-architecture diagram** + an engineering-rigor section in the live demo.
- **Trace export** — download any run's structured trace as JSON.
- **Optional real-LLM toggle** — bring-your-own-OpenAI-key narration (key never leaves the browser).
- **CI moved to repo root** and split into Python-core and Next.js-build jobs.

## [0.1.0] — 2026-06-29

### Added
- **Core agentic-loop engine** (`core/`) — explicit `Perceive → Plan → Act → Observe → Reflect → Adapt` state machine with bounded-autonomy budgets and durable checkpointing.
- **Agents** — Planner, Actor, and Verifier/Critic with injected, mockable dependencies.
- **Tool registry** — schema-validated, permission-scoped tools with retries, a circuit breaker, and an audit log.
- **Memory service** — working / episodic / semantic memory with RAG-style recall and consolidation.
- **Model router** — cost-aware routing across cloud and self-hosted providers (deterministic mock provider for offline runs).
- **Observability** — structured span/event tracing with an in-memory replay buffer.
- **Test suite** — 9 unit tests, 92% coverage on core orchestration; CI across Python 3.10–3.12.
- **Live web demo** (`web-demo/`) — Next.js 14 app animating the full loop client-side; deployed at [aarop.vercel.app](https://aarop.vercel.app/).
- **Docs** — architecture (C4 diagrams + 5 ADRs), full project specification, and a 4-page PDF case study.

[0.1.0]: https://github.com/devtechedge/aarop/releases/tag/v0.1.0
