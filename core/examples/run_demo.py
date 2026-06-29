"""
End-to-end demo: wire the AAROP components and run the agentic loop offline.

Usage:
    python examples/run_demo.py --verbose
    python examples/run_demo.py --objective "calculate 21*2 + 8"
"""
from __future__ import annotations

import argparse
import json

from aarop.agents.agents import Actor, Planner, Verifier
from aarop.core.loop import AgenticLoop, Budget
from aarop.memory.store import MemoryService
from aarop.observability.tracing import get_trace, set_verbose
from aarop.routing.model_router import ModelRouter
from aarop.tools.registry import default_registry


def build_loop() -> AgenticLoop:
    router = ModelRouter()
    registry = default_registry()
    memory = MemoryService()
    return AgenticLoop(
        planner=Planner(router),
        actor=Actor(registry, router),
        verifier=Verifier(router),
        memory=memory,
        budget=Budget(max_steps=8, max_cost_usd=0.50, max_seconds=30),
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--objective", default="calculate 21*2 + 8")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    set_verbose(args.verbose)
    loop = build_loop()
    state = loop.run(args.objective)

    print("\n=== RESULT ===")
    print(json.dumps(state.checkpoint(), indent=2))
    print(f"\nPhase trace: {' -> '.join(h['to'] for h in state.history)}")
    print(f"Trace events captured: {len(get_trace(state.run_id))}")


if __name__ == "__main__":
    main()
