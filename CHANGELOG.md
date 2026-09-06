# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.4.1] — 2026-09-06

### Added
- Web-demo security headers (CSP, X-Frame-Options DENY, nosniff, referrer, permissions) in `web-demo/next.config.mjs`.
- SECURITY.md updated for header controls; BYOK OpenAI key remains browser-only (no first-party logging).

## [0.4.0] — 2026-08-21

### Added
- Root [`SECURITY.md`](SECURITY.md) — honest threat model for the client-side demo and offline Python core.
- Web-demo **unit tests** (`node:test`) covering calculator allow-list, planner, verifier, loop completion, circuit-breaker escalation, and step budgets.
- **Playwright** Chromium smokes: hero render, compute → verified result, budget → escalate, theme toggle.
- **Dependabot** weekly for `web-demo` npm, `core` pip, and GitHub Actions (patch/minor grouped, majors ignored).
- `npm run typecheck` (`tsc --noEmit`) and a Node **22** CI job: install → unit → typecheck → e2e.

### Changed
- Python suite expanded **9 → 24** tests; core coverage **92% → 99%**.
- Live demo CI is no longer build-only.
- Next.js patched **14.2.5 → 14.2.35** (stay on 14; do not force 15/16).
- Trace now yields the `loop_complete` event so the UI matches the generator.

## [0.3.0] — 2026-06-29

### Changed
- **Full UI redesign** with a sky→dusk design language: refined color tokens, Inter typography with a modular type scale, sticky top nav, restyled hero with dual CTAs, and softer rounded cards.

### Added
- **Light / dark theme toggle** — system-aware default (respects `prefers-color-scheme`), manual override persisted to `localStorage`, with a no-flash-on-load script.

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

[0.4.0]: https://github.com/devtechedge/aarop/releases/tag/v0.4.0
[0.1.0]: https://github.com/devtechedge/aarop/releases/tag/v0.1.0
