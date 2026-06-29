"""
Tool Registry — pluggable, schema-validated, permission-scoped tools.

Every tool advertises a JSON-schema-style I/O contract. Calls are validated,
audited, retried, and protected by a simple circuit breaker. Real deployments
run tools inside a sandbox (seccomp/containers); here they run in-process with
input validation to demonstrate the contract enforcement.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Callable

from aarop.observability.tracing import emit_event


@dataclass
class ToolSpec:
    name: str
    description: str
    required_args: list[str]
    scope: str               # permission scope, e.g. "read", "exec", "net"
    fn: Callable[[dict[str, Any]], Any]
    max_retries: int = 2


class CircuitBreaker:
    def __init__(self, threshold: int = 3, cooldown: float = 5.0):
        self.threshold = threshold
        self.cooldown = cooldown
        self._failures: dict[str, int] = {}
        self._opened_at: dict[str, float] = {}

    def allow(self, name: str) -> bool:
        if self._failures.get(name, 0) < self.threshold:
            return True
        if time.time() - self._opened_at.get(name, 0) > self.cooldown:
            self._failures[name] = 0  # half-open: allow a probe
            return True
        return False

    def record(self, name: str, ok: bool) -> None:
        if ok:
            self._failures[name] = 0
        else:
            self._failures[name] = self._failures.get(name, 0) + 1
            self._opened_at[name] = time.time()


class ToolRegistry:
    def __init__(self, allowed_scopes: set[str] | None = None):
        self._tools: dict[str, ToolSpec] = {}
        self._breaker = CircuitBreaker()
        self.allowed_scopes = allowed_scopes or {"read", "exec", "net"}
        self.audit_log: list[dict[str, Any]] = []

    def register(self, spec: ToolSpec) -> None:
        if spec.scope not in self.allowed_scopes:
            raise PermissionError(f"scope '{spec.scope}' not permitted for {spec.name}")
        self._tools[spec.name] = spec

    def _validate(self, spec: ToolSpec, args: dict[str, Any]) -> None:
        missing = [a for a in spec.required_args if a not in args]
        if missing:
            raise ValueError(f"{spec.name}: missing required args {missing}")

    def call(self, name: str, args: dict[str, Any]) -> dict[str, Any]:
        if name not in self._tools:
            return {"error": f"unknown tool '{name}'"}
        spec = self._tools[name]
        if not self._breaker.allow(name):
            return {"error": f"circuit open for '{name}'"}
        try:
            self._validate(spec, args)
        except ValueError as e:
            return {"error": str(e)}

        last_err = None
        for attempt in range(spec.max_retries + 1):
            try:
                out = spec.fn(args)
                self._breaker.record(name, ok=True)
                self.audit_log.append({"tool": name, "args": args, "ok": True})
                emit_event("tool_call", tool=name, attempt=attempt, ok=True)
                return {"result": out}
            except Exception as e:  # noqa: BLE001 - tools may raise anything
                last_err = str(e)
                self._breaker.record(name, ok=False)
                emit_event("tool_call", tool=name, attempt=attempt, ok=False, error=last_err)
        self.audit_log.append({"tool": name, "args": args, "ok": False, "error": last_err})
        return {"error": last_err}

    def list_tools(self) -> list[dict[str, str]]:
        return [{"name": t.name, "description": t.description, "scope": t.scope}
                for t in self._tools.values()]


def default_registry() -> ToolRegistry:
    """A small set of safe, offline demo tools."""
    reg = ToolRegistry()

    def calc(args: dict[str, Any]) -> float:
        expr = str(args["expression"])
        if not set(expr) <= set("0123456789+-*/(). "):
            raise ValueError("unsafe expression")
        return eval(expr, {"__builtins__": {}}, {})  # noqa: S307 - sandboxed charset

    def kb_lookup(args: dict[str, Any]) -> str:
        kb = {
            "agentic loop": "Perceive, Plan, Act, Observe, Reflect, Adapt.",
            "react": "Reasoning + Acting interleaved with tool use.",
        }
        return kb.get(args["query"].lower(), "no entry found")

    reg.register(ToolSpec("calculator", "Evaluate arithmetic.",
                          ["expression"], "exec", calc))
    reg.register(ToolSpec("kb_lookup", "Look up a known concept.",
                          ["query"], "read", kb_lookup))
    return reg
