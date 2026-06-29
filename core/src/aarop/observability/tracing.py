"""
Lightweight, dependency-free tracing shim.

In production this is backed by OpenTelemetry + Langfuse (see docs/OBSERVABILITY.md).
For the local/demo runtime it emits structured events to an in-memory ring
buffer and stdout, so every agentic run is fully reconstructable and replayable
without external infrastructure.
"""
from __future__ import annotations

import json
import time
from contextlib import contextmanager
from typing import Any

# In-memory event sink. A real deployment swaps this for an OTel exporter.
_EVENTS: list[dict[str, Any]] = []
_VERBOSE = False


def set_verbose(value: bool) -> None:
    global _VERBOSE
    _VERBOSE = value


def emit_event(name: str, **fields: Any) -> None:
    evt = {"ts": round(time.time(), 4), "event": name, **fields}
    _EVENTS.append(evt)
    if _VERBOSE:
        print(json.dumps(evt))


@contextmanager
def span(name: str, **attrs: Any):
    start = time.time()
    emit_event(f"{name}.start", **attrs)
    try:
        yield
    finally:
        emit_event(f"{name}.end", duration_ms=round((time.time() - start) * 1000, 2), **attrs)


def get_trace(run_id: str | None = None) -> list[dict[str, Any]]:
    if run_id is None:
        return list(_EVENTS)
    return [e for e in _EVENTS if e.get("run_id") == run_id]


def clear_trace() -> None:
    _EVENTS.clear()
