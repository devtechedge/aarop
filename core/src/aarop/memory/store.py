"""
Memory Service — working, episodic, semantic, and procedural memory.

Production backs this with pgvector/Qdrant + Postgres + Redis. The demo uses an
in-memory store with a transparent bag-of-words similarity so RAG-style recall
works offline and deterministically.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Any


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _cosine(a: Counter, b: Counter) -> float:
    if not a or not b:
        return 0.0
    common = set(a) & set(b)
    num = sum(a[t] * b[t] for t in common)
    den = math.sqrt(sum(v * v for v in a.values())) * math.sqrt(sum(v * v for v in b.values()))
    return num / den if den else 0.0


@dataclass
class MemoryRecord:
    objective: str
    answer: str
    meta: dict[str, Any] = field(default_factory=dict)
    _vec: Counter = field(default_factory=Counter)


class MemoryService:
    def __init__(self) -> None:
        self.episodic: list[MemoryRecord] = []   # past task traces
        self.semantic: list[MemoryRecord] = []    # distilled knowledge
        self.working: dict[str, Any] = {}         # per-run scratch

    def commit(self, objective: str, answer: str, meta: dict[str, Any]) -> None:
        rec = MemoryRecord(objective, answer, meta, Counter(_tokenize(objective + " " + answer)))
        self.episodic.append(rec)

    def recall(self, query: str, k: int = 4) -> list[dict[str, Any]]:
        qv = Counter(_tokenize(query))
        scored = sorted(
            ((_cosine(qv, r._vec), r) for r in self.episodic + self.semantic),
            key=lambda x: x[0], reverse=True,
        )
        return [{"objective": r.objective, "answer": r.answer, "score": round(s, 3)}
                for s, r in scored[:k] if s > 0]

    def consolidate(self) -> int:
        """Distill recurring successful episodes into semantic memory."""
        counts = Counter(r.objective for r in self.episodic)
        promoted = 0
        for obj, n in counts.items():
            if n >= 2 and not any(s.objective == obj for s in self.semantic):
                rec = next(r for r in self.episodic if r.objective == obj)
                self.semantic.append(rec)
                promoted += 1
        return promoted
