"""
AAROP — Core Agentic Loop Engine.

Implements the canonical agentic control loop as an explicit, inspectable
state machine: Perceive -> Plan -> Act -> Observe -> Reflect -> Adapt.

The loop is the beating heart of the system. It is intentionally NOT hidden
inside a prompt chain — every phase transition, budget check, and decision is
a first-class, observable event so the entire run can be replayed and audited.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional

from aarop.observability.tracing import span, emit_event


class Phase(str, Enum):
    PERCEIVE = "perceive"
    PLAN = "plan"
    ACT = "act"
    OBSERVE = "observe"
    REFLECT = "reflect"
    ADAPT = "adapt"
    DONE = "done"
    FAILED = "failed"
    ESCALATED = "escalated"


@dataclass
class Budget:
    """Bounded-autonomy guardrails. Every loop must respect these."""
    max_steps: int = 12
    max_cost_usd: float = 1.00
    max_seconds: float = 120.0

    def exceeded(self, steps: int, cost: float, elapsed: float) -> Optional[str]:
        if steps >= self.max_steps:
            return f"step budget exceeded ({steps}/{self.max_steps})"
        if cost >= self.max_cost_usd:
            return f"cost budget exceeded (${cost:.4f}/${self.max_cost_usd})"
        if elapsed >= self.max_seconds:
            return f"time budget exceeded ({elapsed:.1f}s/{self.max_seconds}s)"
        return None


@dataclass
class LoopState:
    """Durable, checkpointable state for a single agentic run."""
    run_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    objective: str = ""
    phase: Phase = Phase.PERCEIVE
    steps: int = 0
    cost_usd: float = 0.0
    started_at: float = field(default_factory=time.time)
    context: dict[str, Any] = field(default_factory=dict)
    plan: list[dict[str, Any]] = field(default_factory=list)
    scratchpad: list[dict[str, Any]] = field(default_factory=list)
    result: Optional[str] = None
    confidence: float = 0.0
    history: list[dict[str, Any]] = field(default_factory=list)

    def elapsed(self) -> float:
        return time.time() - self.started_at

    def checkpoint(self) -> dict[str, Any]:
        """Serializable snapshot for crash recovery / deterministic replay."""
        return {
            "run_id": self.run_id,
            "objective": self.objective,
            "phase": self.phase.value,
            "steps": self.steps,
            "cost_usd": round(self.cost_usd, 6),
            "confidence": self.confidence,
            "plan": self.plan,
            "scratchpad": self.scratchpad,
            "result": self.result,
        }


class AgenticLoop:
    """
    Orchestrates one objective through the perceive->adapt cycle until the
    verifier accepts the result, a budget is exhausted, or it escalates.

    Dependencies are injected (model router, tools, memory, verifier) so every
    backend is pluggable and the loop logic is fully unit-testable with mocks.
    """

    def __init__(self, planner, actor, verifier, memory, budget: Budget | None = None):
        self.planner = planner
        self.actor = actor
        self.verifier = verifier
        self.memory = memory
        self.budget = budget or Budget()

    def run(self, objective: str, context: dict[str, Any] | None = None) -> LoopState:
        state = LoopState(objective=objective, context=context or {})
        with span("agentic_loop", run_id=state.run_id, objective=objective):
            while state.phase not in (Phase.DONE, Phase.FAILED, Phase.ESCALATED):
                reason = self.budget.exceeded(state.steps, state.cost_usd, state.elapsed())
                if reason and state.phase != Phase.REFLECT:
                    self._transition(state, Phase.ESCALATED, note=f"budget: {reason}")
                    break
                self._dispatch(state)
            emit_event("loop_complete", run_id=state.run_id,
                       phase=state.phase.value, steps=state.steps,
                       cost=round(state.cost_usd, 4), confidence=state.confidence)
        return state

    # -- phase dispatcher -------------------------------------------------
    def _dispatch(self, state: LoopState) -> None:
        handler: dict[Phase, Callable[[LoopState], None]] = {
            Phase.PERCEIVE: self._perceive,
            Phase.PLAN: self._plan,
            Phase.ACT: self._act,
            Phase.OBSERVE: self._observe,
            Phase.REFLECT: self._reflect,
            Phase.ADAPT: self._adapt,
        }
        handler[state.phase](state)

    def _transition(self, state: LoopState, to: Phase, **note) -> None:
        emit_event("phase_transition", run_id=state.run_id,
                   **{"from": state.phase.value, "to": to.value, **note})
        state.history.append({"from": state.phase.value, "to": to.value,
                              "step": state.steps, **note})
        state.phase = to

    # -- phases -----------------------------------------------------------
    def _perceive(self, state: LoopState) -> None:
        """Normalize inputs + retrieve relevant context/memory (RAG)."""
        with span("perceive", run_id=state.run_id):
            recalled = self.memory.recall(state.objective, k=4)
            state.context["recalled"] = recalled
            self._transition(state, Phase.PLAN)

    def _plan(self, state: LoopState) -> None:
        """Build a hierarchical, cost-aware task graph."""
        with span("plan", run_id=state.run_id):
            plan, cost = self.planner.plan(state.objective, state.context)
            state.plan = plan
            state.cost_usd += cost
            self._transition(state, Phase.ACT, n_tasks=len(plan))

    def _act(self, state: LoopState) -> None:
        """Execute next task via sandboxed, schema-validated tools/agents."""
        with span("act", run_id=state.run_id):
            state.steps += 1
            task = state.plan[0] if state.plan else {"tool": "noop", "args": {}}
            result, cost = self.actor.act(task, state.context)
            state.cost_usd += cost
            state.scratchpad.append({"task": task, "result": result})
            self._transition(state, Phase.OBSERVE, task=task.get("tool"))

    def _observe(self, state: LoopState) -> None:
        """Capture structured results + detect anomalies."""
        with span("observe", run_id=state.run_id):
            last = state.scratchpad[-1]["result"] if state.scratchpad else None
            anomaly = last is None or (isinstance(last, dict) and last.get("error"))
            self._transition(state, Phase.REFLECT, anomaly=bool(anomaly))

    def _reflect(self, state: LoopState) -> None:
        """Self-critique against acceptance criteria via the verifier."""
        with span("reflect", run_id=state.run_id):
            verdict = self.verifier.verify(state.objective, state.scratchpad)
            state.confidence = verdict["confidence"]
            if verdict["accepted"]:
                state.result = verdict["answer"]
                self.memory.commit(state.objective, state.result, state.checkpoint())
                self._transition(state, Phase.DONE, confidence=state.confidence)
            else:
                self._transition(state, Phase.ADAPT, reason=verdict["reason"])

    def _adapt(self, state: LoopState) -> None:
        """Replan / retry with backoff / escalate to human-in-the-loop."""
        with span("adapt", run_id=state.run_id):
            reason = self.budget.exceeded(state.steps, state.cost_usd, state.elapsed())
            if reason:
                self._transition(state, Phase.ESCALATED, note=f"budget: {reason}")
                return
            # Drop the failed task and replan from the remaining objective.
            if state.plan:
                state.plan.pop(0)
            self._transition(state, Phase.PLAN if state.plan else Phase.PERCEIVE)
