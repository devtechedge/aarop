# AAROP — Architecture & Design Decisions

## 1. C4 — Context

```
[User / API client] ──objective──► [AAROP Platform] ──results+trace──► [User]
                                         │
                          ┌──────────────┼───────────────┐
                          ▼              ▼               ▼
                   [Model Providers] [Tool Sandboxes] [Memory/Vector Store]
```

## 2. C4 — Container

```
┌─────────────────────────────────────────────────────────────┐
│  API Gateway (auth, rate-limit, budget, schema validation)   │
└───────────────┬─────────────────────────────────────────────┘
                ▼
        ┌───────────────┐        ┌────────────────────┐
        │  Orchestrator │◄──────►│  Workflow Engine    │
        │ (Agentic Loop)│        │  (Temporal / sagas) │
        └──┬─────┬──────┘        └────────────────────┘
           │     │
    ┌──────┘     └──────┐
    ▼                   ▼
[Worker Agents]   [Tool Registry]   [Memory Service]   [Model Router]
    │                   │                  │                 │
    └──────────────┬────┴──────────────────┴─────────────────┘
                   ▼
       [Observability + Eval + FinOps]
```

## 3. Sequence — one agentic run

```
Client → Orchestrator: run(objective, budget)
Orchestrator → Memory: recall(objective)          # PERCEIVE
Orchestrator → Planner: plan(objective, ctx)       # PLAN  (cost metered)
loop until accepted | budget exhausted:
    Orchestrator → Actor → ToolRegistry: call(tool, args)   # ACT (validated, sandboxed)
    Orchestrator: detect anomaly                            # OBSERVE
    Orchestrator → Verifier: verify(objective, scratchpad)  # REFLECT
    alt accepted:
        Orchestrator → Memory: commit(result)               # DONE
    else:
        Orchestrator: replan / retry / escalate             # ADAPT
Orchestrator → Client: state.checkpoint() + trace
```

## 4. Production reference stack (mapping from demo)

| Concern | Demo (this repo) | Production |
|---|---|---|
| Loop durability | in-process state machine | **Temporal** durable workflow + checkpoints |
| Model backend | `MockProvider` | OpenAI/Anthropic + self-hosted **vLLM/Ollama** |
| Memory / RAG | in-memory bag-of-words | **pgvector / Qdrant** + BM25 + cross-encoder reranker |
| State store | Python dataclass | **Postgres** + **Redis** (working memory) |
| Tool sandbox | charset-restricted eval | gVisor / **seccomp containers** |
| Tracing | in-memory event buffer | **OpenTelemetry** + Langfuse/Phoenix |
| Serving | CLI | **FastAPI** + Celery/Arq workers, gRPC A2A |
| Infra | none | **Docker + K8s + Helm + Terraform**, KEDA autoscaling |

## 5. Architecture Decision Records (ADRs)

### ADR-001 — The agentic loop is an explicit state machine
**Context:** Prompt-chained agents are opaque and hard to debug/recover.
**Decision:** Model `Perceive→…→Adapt` as enumerated phases with logged transitions.
**Consequences:** +observability, +replay, +crash recovery; −slightly more boilerplate. **Accepted.**

### ADR-002 — Bounded autonomy via Budget guardrails
**Context:** Agents can loop forever or blow up cost.
**Decision:** Every run carries `max_steps/max_cost/max_seconds`; exceeding → escalate.
**Consequences:** predictable cost & latency; safe failure mode (human escalation). **Accepted.**

### ADR-003 — Verifier/Critic gate before commit
**Context:** Single-pass LLM output is unreliable.
**Decision:** No result is returned/committed until a critic accepts it vs. acceptance criteria.
**Consequences:** higher quality, measurable error reduction; +one model call per cycle. **Accepted.**

### ADR-004 — Pluggable, schema-validated tools with a circuit breaker
**Context:** Tools are the main failure & security surface.
**Decision:** Typed contracts + permission scopes + retries + circuit breaker + audit log.
**Consequences:** resilient and auditable; tools are hot-swappable. **Accepted.**

### ADR-005 — Offline-first, dependency-free core
**Context:** Reviewers/recruiters must run it instantly; CI must be hermetic.
**Decision:** Core has zero runtime deps and a deterministic mock model.
**Consequences:** trivial to run & test; real backends added at the edges. **Accepted.**
