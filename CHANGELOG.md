# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

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
