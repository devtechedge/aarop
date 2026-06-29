"""
Agents — Planner, Actor (tool-using worker), and Verifier/Critic.

These implement the pluggable interfaces the AgenticLoop depends on. They are
deliberately small and deterministic so the architecture is legible and the
loop logic is fully testable. Swap these for LLM-backed agents in production.
"""
from __future__ import annotations

from typing import Any

from aarop.routing.model_router import ModelRouter
from aarop.tools.registry import ToolRegistry


class Planner:
    """Decomposes an objective into a small task graph (cost-aware)."""

    def __init__(self, router: ModelRouter):
        self.router = router

    def plan(self, objective: str, context: dict[str, Any]) -> tuple[list[dict[str, Any]], float]:
        _, cost = self.router.complete(f"plan: {objective}", task_type="reasoning", max_tokens=128)
        # Heuristic decomposition: detect intent and emit typed tasks.
        obj = objective.lower()
        plan: list[dict[str, Any]] = []
        if any(c in obj for c in "+-*/") or "calculate" in obj or "sum" in obj:
            expr = "".join(c for c in objective if c in "0123456789+-*/(). ")
            plan.append({"tool": "calculator", "args": {"expression": expr.strip() or "1+1"}})
        else:
            term = objective.split()[0] if objective else "agentic loop"
            plan.append({"tool": "kb_lookup", "args": {"query": objective}})
        return plan, cost


class Actor:
    """Executes a task by invoking a validated tool via the registry."""

    def __init__(self, registry: ToolRegistry, router: ModelRouter):
        self.registry = registry
        self.router = router

    def act(self, task: dict[str, Any], context: dict[str, Any]) -> tuple[dict[str, Any], float]:
        out = self.registry.call(task.get("tool", "noop"), task.get("args", {}))
        _, cost = self.router.complete(f"act: {task}", task_type="cheap", max_tokens=64)
        return out, cost


class Verifier:
    """Critic that scores results against acceptance criteria."""

    def __init__(self, router: ModelRouter, threshold: float = 0.6):
        self.router = router
        self.threshold = threshold

    def verify(self, objective: str, scratchpad: list[dict[str, Any]]) -> dict[str, Any]:
        if not scratchpad:
            return {"accepted": False, "confidence": 0.0,
                    "reason": "no work produced", "answer": None}
        last = scratchpad[-1]["result"]
        if isinstance(last, dict) and "error" in last:
            return {"accepted": False, "confidence": 0.2,
                    "reason": last["error"], "answer": None}
        result = last.get("result") if isinstance(last, dict) else last
        # Confidence rises with a clean, non-empty result and prior context.
        confidence = 0.9 if result not in (None, "", "no entry found") else 0.4
        accepted = confidence >= self.threshold
        return {"accepted": accepted, "confidence": confidence,
                "reason": "ok" if accepted else "low-confidence result",
                "answer": str(result)}
