"""Unit tests for the core agentic loop, budgets, tools, and memory."""
from __future__ import annotations

import json

import pytest

from aarop.agents.agents import Actor, Planner, Verifier
from aarop.core.loop import AgenticLoop, Budget, Phase
from aarop.memory.store import MemoryService
from aarop.observability.tracing import (
    clear_trace,
    emit_event,
    get_trace,
    set_verbose,
    span,
)
from aarop.routing.model_router import ModelRouter
from aarop.tools.registry import CircuitBreaker, ToolRegistry, ToolSpec, default_registry


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


def test_cost_budget_escalation_is_enforced():
    loop = build(budget=Budget(max_cost_usd=0.0))
    state = loop.run("calculate 1+1")
    assert state.phase == Phase.ESCALATED
    assert any("cost budget" in (h.get("note") or "") for h in state.history)


def test_time_budget_escalation_is_enforced():
    loop = build(budget=Budget(max_seconds=0.0))
    state = loop.run("calculate 1+1")
    assert state.phase == Phase.ESCALATED
    assert any("time budget" in (h.get("note") or "") for h in state.history)


def test_checkpoint_is_json_serializable():
    loop = build()
    state = loop.run("calculate 2+2")
    snap = state.checkpoint()
    assert snap["phase"] == "done"
    assert snap["result"] == "4"
    json.dumps(snap)


def test_unknown_lookup_adapts_then_escalates():
    loop = build(budget=Budget(max_steps=2))
    state = loop.run("zzzz-unknown-concept")
    assert any(h["to"] == "adapt" for h in state.history)
    assert state.phase == Phase.ESCALATED


def test_memory_recall_after_commit():
    mem = MemoryService()
    mem.commit("what is the agentic loop", "perceive plan act", {})
    hits = mem.recall("agentic loop", k=3)
    assert hits and hits[0]["score"] > 0


def test_memory_recall_on_empty_store():
    assert MemoryService().recall("anything") == []


def test_memory_consolidation_promotes_repeats():
    mem = MemoryService()
    for _ in range(2):
        mem.commit("recurring task", "answer", {})
    assert mem.consolidate() == 1


def test_tool_validation_rejects_missing_args():
    reg = default_registry()
    out = reg.call("calculator", {})
    assert "error" in out and "missing" in out["error"]


def test_calculator_evaluates_expression():
    out = default_registry().call("calculator", {"expression": "21*2 + 8"})
    assert out["result"] == 50


def test_unknown_tool_is_rejected():
    out = default_registry().call("nope", {})
    assert "unknown tool" in out["error"]


def test_kb_lookup_hit_and_miss():
    reg = default_registry()
    hit = reg.call("kb_lookup", {"query": "agentic loop"})
    miss = reg.call("kb_lookup", {"query": "unknown-term-xyz"})
    assert "Perceive" in hit["result"]
    assert miss["result"] == "no entry found"


def test_list_tools_advertises_demo_set():
    names = {t["name"] for t in default_registry().list_tools()}
    assert names == {"calculator", "kb_lookup"}


def test_register_rejects_unknown_scope():
    reg = ToolRegistry(allowed_scopes={"read"})
    with pytest.raises(PermissionError):
        reg.register(ToolSpec("x", "d", [], "exec", lambda a: None))


def test_tool_circuit_breaker_opens():
    reg = ToolRegistry()

    def always_fail(args):
        raise RuntimeError("boom")

    reg.register(ToolSpec("flaky", "fails", [], "exec", always_fail, max_retries=0))
    for _ in range(3):
        reg.call("flaky", {})
    out = reg.call("flaky", {})
    assert out["error"].startswith("circuit open")


def test_circuit_breaker_half_open_after_cooldown():
    breaker = CircuitBreaker(threshold=1, cooldown=0.0)
    breaker.record("x", ok=False)
    assert breaker.allow("x") is True


def test_unsafe_calculator_expression_blocked():
    reg = default_registry()
    out = reg.call("calculator", {"expression": "__import__('os')"})
    assert "error" in out


def test_verifier_rejects_empty_work():
    v = Verifier(ModelRouter())
    verdict = v.verify("obj", [])
    assert verdict["accepted"] is False


def test_verifier_rejects_tool_error():
    v = Verifier(ModelRouter())
    verdict = v.verify("obj", [{"result": {"error": "boom"}}])
    assert verdict["accepted"] is False
    assert "boom" in verdict["reason"]


def test_planner_routes_math_vs_lookup():
    planner = Planner(ModelRouter())
    math_plan, math_cost = planner.plan("calculate 3+4", {})
    kb_plan, kb_cost = planner.plan("what is rag", {})
    assert math_plan[0]["tool"] == "calculator"
    assert kb_plan[0]["tool"] == "kb_lookup"
    assert math_cost >= 0 and kb_cost >= 0


def test_router_is_deterministic_and_costed():
    router = ModelRouter()
    text, cost = router.complete("hi", task_type="reasoning")
    again, _ = router.complete("hi", task_type="reasoning")
    assert text == again
    assert "mock-llm" in text
    assert cost >= 0
    assert router.route("cheap").name == "mock-llm"


def test_tracing_filters_by_run_and_clears():
    clear_trace()
    emit_event("hello", run_id="abc")
    emit_event("other", run_id="zzz")
    assert len(get_trace("abc")) == 1
    with span("s", run_id="abc"):
        pass
    assert any(e["event"] == "s.start" for e in get_trace("abc"))
    set_verbose(True)
    emit_event("verbose", run_id="abc")
    set_verbose(False)
    clear_trace()
    assert get_trace() == []
