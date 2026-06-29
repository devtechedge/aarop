"""
Model Router — selects a model backend by task type, cost, and latency.

Supports cloud providers and self-hosted models behind one interface. The demo
ships a deterministic MockProvider so the whole system runs offline, with no API
keys, while preserving the exact routing/cost-metering behavior of production.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Protocol


class ModelProvider(Protocol):
    name: str
    cost_per_1k_tokens: float

    def complete(self, prompt: str, max_tokens: int = 256) -> tuple[str, float]:
        """Return (completion, cost_usd)."""
        ...


@dataclass
class MockProvider:
    """Deterministic, offline provider for tests/demos."""
    name: str = "mock-llm"
    cost_per_1k_tokens: float = 0.0005

    def complete(self, prompt: str, max_tokens: int = 256) -> tuple[str, float]:
        digest = hashlib.sha256(prompt.encode()).hexdigest()[:8]
        tokens = min(max_tokens, max(16, len(prompt) // 4))
        cost = (tokens / 1000) * self.cost_per_1k_tokens
        return f"[{self.name}:{digest}] response to: {prompt[:60]}", round(cost, 6)


class ModelRouter:
    def __init__(self, providers: list[ModelProvider] | None = None):
        self.providers = providers or [MockProvider()]
        self._policy = {
            "reasoning": 0,   # index into providers; real impl maps to capable models
            "cheap": 0,
            "default": 0,
        }

    def route(self, task_type: str = "default") -> ModelProvider:
        idx = self._policy.get(task_type, self._policy["default"])
        return self.providers[min(idx, len(self.providers) - 1)]

    def complete(self, prompt: str, task_type: str = "default",
                 max_tokens: int = 256) -> tuple[str, float]:
        provider = self.route(task_type)
        return provider.complete(prompt, max_tokens)
