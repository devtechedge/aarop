"""Unit tests for the core agentic loop, budgets, tools, and memory."""
from __future__ import annotations

import pytest

from aarop.agents.agents import Actor, Planner, Verifier
from aarop.core.loop import AgenticLoop, Budget, Phase
from aarop.memory.store import MemoryService
from aarop.routing.model_router import ModelRouter
from aarop.tools.registry import ToolRegistry, ToolSpec, default_registry


def build(budget=None):
    router = ModelRouter()
    return AgenticLoop(
        planner=Planner(router),
        actor=Actor(default_registry(), router),
        verifier=Verifier(router),
        memory=MemoryService(),
        budget=budget or Budget(),
    )


def test_loop_completes_calculation():
    loop = build()
    state = loop.run("calculate 21*2 + 8")
    assert state.phase == Phase.DONE
    assert state.result == "50"
    assert state.confidence >= 0.6
    assert state.steps >= 1


def test_loop_records_full_phase_history():
    loop = build()
    state = loop.run("calculate 2+2")
    phases = [h["to"] for h in state.history]
    assert "plan" in phases and "act" in phases and "reflect" in phases


def test_budget_escalation_is_enforced():
    loop = build(budget=Budget(max_steps=0))
    state = loop.run("calculate 1+1")
    assert state.phase == Phase.ESCALATED


def test_memory_recall_after_commit():
    mem = MemoryService()
    mem.commit("what is the agentic loop", "perceive plan act", {})
    hits = mem.recall("agentic loop", k=3)
    assert hits and hits[0]["score"] > 0


def test_memory_consolidation_promotes_repeats():
    mem = MemoryService()
    for _ in range(2):
        mem.commit("recurring task", "answer", {})
    assert mem.consolidate() == 1


def test_tool_validation_rejects_missing_args():
    reg = default_registry()
    out = reg.call("calculator", {})
    assert "error" in out and "missing" in out["error"]


def test_tool_circuit_breaker_opens():
    reg = ToolRegistry()

    def always_fail(args):
        raise RuntimeError("boom")

    reg.register(ToolSpec("flaky", "fails", [], "exec", always_fail, max_retries=0))
    for _ in range(3):
        reg.call("flaky", {})
    out = reg.call("flaky", {})
    assert out["error"].startswith("circuit open")


def test_unsafe_calculator_expression_blocked():
    reg = default_registry()
    out = reg.call("calculator", {"expression": "__import__('os')"})
    assert "error" in out


def test_verifier_rejects_empty_work():
    v = Verifier(ModelRouter())
    verdict = v.verify("obj", [])
    assert verdict["accepted"] is False
