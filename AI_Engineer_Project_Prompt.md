# AI Engineer Project Prompt — Autonomous Agentic Reasoning \& Orchestration Platform (AAROP)

> \*\*Role Directive:\*\* You are to act as a \*\*Chief AI Architect with 20+ years of distributed systems, ML platform, and applied AI engineering experience\*\*. You will design and build a complete, end-to-end, production-grade, deeply complex AI engineering system grounded in \*\*agentic loop engineering principles\*\* (perceive → plan → act → observe → reflect → adapt). This is a \*prompt specification only\* — produce the full architecture, code, infrastructure, and operational design as instructed, but treat this document as the master blueprint that governs the build.

\---

## 1\. Mission \& North-Star Objective

Design and implement **AAROP — Autonomous Agentic Reasoning \& Orchestration Platform**: a self-improving, multi-agent system that ingests open-ended objectives, decomposes them into executable plans, orchestrates a fleet of specialized tool-using agents through closed feedback loops, verifies its own outputs, and continuously learns from execution traces. The platform must be horizontally scalable, observable, secure, cost-governed, and capable of running both cloud-hosted and self-hosted models.

**Success is defined by:** measurable task-completion rate, factual grounding/verification scores, cost-per-successful-task, latency SLOs, autonomous error-recovery rate, and a demonstrable self-improvement curve over time.

\---

## 2\. Core Design Philosophy — Agentic Loop Engineering

Every subsystem must conform to the canonical **agentic control loop**, implemented as a first-class, inspectable state machine — not buried in prompt strings:

1. **Perceive** — normalize inputs, retrieve relevant context (RAG + memory), assess environment/tool state.
2. **Plan** — generate a hierarchical task graph (HTN/tree-of-thought hybrid), estimate cost/risk, select strategy.
3. **Act** — invoke tools/sub-agents with typed contracts, sandboxed execution, and budget enforcement.
4. **Observe** — capture structured results, side effects, and telemetry; detect anomalies.
5. **Reflect** — self-critique against acceptance criteria; run verifier/critic agents; score confidence.
6. **Adapt** — replan, retry with backoff, escalate to human-in-the-loop, or commit results to memory.

The loop must support **bounded autonomy** (step/cost/time budgets), **interruptibility** (pause/resume/cancel), **determinism controls** (seeded replay), and **checkpointing** (durable loop state for crash recovery).

\---

## 3\. Functional Requirements (Must Build)

### 3.1 Multi-Agent Orchestration Layer

* **Orchestrator/Supervisor agent** that owns the global plan and delegates.
* **Specialized worker agents**: Researcher (web/RAG), Coder (codegen + execution), Analyst (data/SQL), Verifier/Critic, Planner, and a Memory Curator.
* **Agent-to-agent (A2A) protocol** with typed messages, capability advertisement, and negotiation.
* **Routing policy**: dynamic model/agent selection by task type, cost, latency, and historical success.
* Support for **hierarchical, sequential, and parallel (fan-out/fan-in)** execution topologies.

### 3.2 Tooling \& Function Calling

* Pluggable **tool registry** with JSON-schema-validated I/O contracts, versioning, and permission scopes.
* Tools: web search, code execution sandbox, SQL/DB connector, file I/O, vector search, HTTP/REST client, shell (sandboxed), and a calculator/symbolic engine.
* **Tool result validation**, retry semantics, idempotency keys, and circuit breakers.

### 3.3 Memory \& Knowledge

* **Short-term working memory** (conversation/loop scratchpad), **episodic memory** (past task traces), **semantic memory** (vector store), and **procedural memory** (learned skills/playbooks).
* **RAG pipeline**: ingestion → chunking (semantic + structural) → embedding → hybrid retrieval (BM25 + dense + reranker) → context assembly with citation tracking.
* **Memory consolidation** job that distills successful traces into reusable skills.

### 3.4 Reasoning \& Planning Engine

* Pluggable strategies: ReAct, Plan-and-Execute, Tree/Graph-of-Thoughts, Reflexion, and self-consistency voting.
* **Cost-aware planner** that prunes branches via value-of-information heuristics.
* **Verifier loop**: every artifact passes through a critic with explicit acceptance criteria before commit.

### 3.5 Self-Improvement Subsystem

* Capture full **execution traces** (inputs, prompts, tool calls, outputs, scores).
* **Offline evaluation harness** + **eval datasets**; automated regression suites for prompts/agents.
* **Prompt/skill optimization loop** (e.g., DSPy-style or evolutionary prompt search) gated by eval gains.
* **Optional fine-tuning/RLAIF pipeline** that learns from preference-labeled traces.

\---

## 4\. Non-Functional Requirements (Chief-Architect Rigor)

* **Scalability:** stateless agent workers behind a queue; horizontal autoscaling; backpressure.
* **Reliability:** durable workflow engine (saga pattern), exactly-once side effects where feasible, dead-letter queues, graceful degradation.
* **Observability:** OpenTelemetry traces spanning the full agentic loop; structured logs; metrics (token usage, cost, latency, success rate); a **trace replay/debugger UI**.
* **Security:** prompt-injection defense, tool sandboxing (seccomp/containers), secrets vault, least-privilege scopes, PII detection/redaction, output guardrails.
* **Governance \& FinOps:** per-tenant/per-task budgets, real-time cost metering, rate limiting, model-cost routing, audit logs.
* **Reproducibility:** seeded runs, versioned prompts/models/datasets, deterministic replay from checkpoints.

\---

## 5\. Reference Architecture (Describe \& Implement)

```
            ┌──────────────────────────────────────────────────┐
            │                   API / Gateway                   │
            │   (Auth, Rate-Limit, Budget, Schema Validation)   │
            └───────────────┬──────────────────────────────────┘
                            │
                  ┌─────────▼─────────┐        ┌──────────────────┐
                  │   Orchestrator    │◄──────►│  Workflow Engine  │
                  │  (Agentic Loop)   │        │ (Durable, Sagas)  │
                  └───┬───────┬───────┘        └──────────────────┘
                      │       │
        ┌─────────────┘       └──────────────┐
        ▼                                     ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐
│  Worker Agents│  │  Tool Registry │  │ Memory Service│  │  Model Router│
│ (Research,    │  │ (Sandboxed     │  │ (Vector+KV+   │  │ (Cloud +     │
│  Code, Verify)│  │  Execution)    │  │  Episodic)    │  │  Self-hosted)│
└───────────────┘  └───────────────┘  └───────────────┘  └──────────────┘
        │                  │                  │                  │
        └──────────────────┴───────┬──────────┴──────────────────┘
                                    ▼
                ┌──────────────────────────────────────┐
                │  Observability + Eval + Self-Improve  │
                │ (OTel, Traces, Eval Harness, FinOps)  │
                └──────────────────────────────────────┘
```

\---

## 6\. Technology Stack (Recommend with Justification)

* **Language/Runtime:** Python 3.12 (async), optional Go/Rust for hot-path tool execution.
* **Agent framework:** custom core (do not hide the loop) + optional LangGraph/LlamaIndex for adapters.
* **Workflow/Orchestration:** Temporal (durable execution) or equivalent saga engine.
* **Serving/Async:** FastAPI + Celery/Arq + Redis; gRPC for A2A.
* **Vector/Memory:** pgvector or Qdrant/Weaviate; Postgres for state; Redis for working memory.
* **Models:** API providers + self-hosted via vLLM/Ollama; embeddings + cross-encoder reranker.
* **Infra:** Docker, Kubernetes, Helm, Terraform; KEDA autoscaling.
* **Observability:** OpenTelemetry, Prometheus, Grafana, Langfuse/Phoenix for LLM tracing.
* **CI/CD:** GitHub Actions, prompt/eval gates, canary deploys.

\---

## 7\. Deliverables (Produce All)

1. **System design doc** with C4 diagrams, sequence diagrams of the agentic loop, and ADRs (Architecture Decision Records).
2. **Full source code** — orchestrator, agents, tool registry, memory, model router, guardrails — clean, typed, tested.
3. **Infrastructure-as-Code** — Terraform + Helm/K8s manifests + Dockerfiles.
4. **Evaluation harness** — datasets, metrics, regression suite, dashboards.
5. **Observability stack** — wired OTel traces + Grafana dashboards + trace-replay tooling.
6. **Security \& governance** — threat model, guardrail configs, budget/FinOps policies.
7. **Runbooks \& docs** — onboarding, operations, incident response, scaling playbook.
8. **Demo scenarios** — at least 3 end-to-end tasks showing perceive→adapt loop in action.

\---

## 8\. Acceptance Criteria \& Quality Bars

* ✅ End-to-end task executes through the full agentic loop with durable checkpointing.
* ✅ Verifier/critic loop measurably reduces error rate vs. single-pass baseline.
* ✅ Cost and latency budgets enforced and observable per task.
* ✅ Full distributed trace reconstructable and replayable for any run.
* ✅ Prompt-injection and sandbox-escape test suite passes.
* ✅ Self-improvement loop shows eval-score gains across iterations without regressions.
* ✅ Test coverage ≥ 85% on core orchestration logic; load test demonstrates horizontal scaling.

\---

## 9\. Engineering Phases (Roadmap)

1. **Phase 0 — Foundations:** repo, CI, IaC skeleton, contracts, telemetry baseline.
2. **Phase 1 — Single-agent loop:** perceive→act→observe→reflect with one tool + memory.
3. **Phase 2 — Multi-agent orchestration:** supervisor, A2A protocol, routing.
4. **Phase 3 — Memory \& RAG:** hybrid retrieval, episodic/semantic/procedural memory.
5. **Phase 4 — Verification \& guardrails:** critic agents, security, governance.
6. **Phase 5 — Self-improvement:** eval harness, prompt optimization, optional fine-tuning.
7. **Phase 6 — Hardening \& scale:** load tests, chaos testing, cost tuning, GA.

\---

## 10\. Constraints \& Operating Rules

* Treat the agentic loop as **explicit, inspectable state** — never an opaque prompt chain.
* Enforce **bounded autonomy**: every loop respects step/cost/time budgets and human escalation gates.
* All tool I/O is **schema-validated, sandboxed, and audited**.
* Favor **modularity and replaceability**: models, tools, memory backends are pluggable.
* Document **every architectural decision** as an ADR with trade-offs.
* Optimize for **reliability and cost first**, raw capability second.

\---

### Final Instruction

Build AAROP exactly to this specification, applying senior-architect judgment where the spec leaves room. Surface trade-offs explicitly, justify every major decision, and ensure the entire perceive→plan→act→observe→reflect→adapt loop is implemented as the beating heart of the system. Do **not** cut corners on observability, verification, or safety.

