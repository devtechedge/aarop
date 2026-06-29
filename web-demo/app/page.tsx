"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  runAgenticLoop,
  PHASE_META,
  type LoopSnapshot,
  type Phase,
} from "@/lib/aarop";

const LOOP_PHASES: Phase[] = ["perceive", "plan", "act", "observe", "reflect", "adapt"];
const EXAMPLES = [
  "calculate 21*2 + 8",
  "what is the agentic loop",
  "calculate (15 + 5) * 3",
  "explain RAG",
];

export default function Page() {
  const [objective, setObjective] = useState("calculate 21*2 + 8");
  const [snap, setSnap] = useState<LoopSnapshot | null>(null);
  const [running, setRunning] = useState(false);
  const traceRef = useRef<HTMLDivElement>(null);

  const run = useCallback(async (obj: string) => {
    if (!obj.trim()) return;
    setRunning(true);
    setSnap(null);
    const gen = runAgenticLoop(obj.trim());
    for (const s of gen) {
      setSnap({ ...s, events: [...s.events] });
      // animate one phase at a time
      await new Promise((r) => setTimeout(r, 650));
    }
    setRunning(false);
  }, []);

  useEffect(() => {
    if (traceRef.current) traceRef.current.scrollTop = traceRef.current.scrollHeight;
  }, [snap]);

  const phase = snap?.phase ?? "perceive";
  const visited = new Set(snap?.history.flatMap((h) => [h.from, h.to]) ?? []);

  const terminal = phase === "done" || phase === "escalated" || phase === "failed";
  const meta = PHASE_META[phase];

  return (
    <div className="wrap">
      <header className="hero">
        <span className="kicker">Live Demo · Agentic Loop Engineering</span>
        <h1 className="title">AAROP</h1>
        <p className="subtitle">
          An autonomous multi-agent reasoning system. Watch a real objective flow through the
          full agentic loop — <b>Perceive → Plan → Act → Observe → Reflect → Adapt</b> — with
          live tool calls, self-verification, budget guardrails, and a replayable trace.
        </p>
        <p className="byline">
          Built by <b>Devayan Mandal</b> · <a href="https://github.com/devtechedge/aarop" target="_blank" rel="noreferrer">github.com/devtechedge/aarop</a>
        </p>
      </header>

      <div className="controls">
        <input
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Enter an objective…"
          onKeyDown={(e) => e.key === "Enter" && !running && run(objective)}
          disabled={running}
        />
        <button className="btn" onClick={() => run(objective)} disabled={running}>
          {running ? "Running…" : "Run Agent ▶"}
        </button>
      </div>
      <div className="examples">
        {EXAMPLES.map((ex) => (
          <span key={ex} className="chip" onClick={() => { if (!running) { setObjective(ex); run(ex); } }}>
            {ex}
          </span>
        ))}
      </div>

      {/* Loop ribbon */}
      <div className="ribbon">
        {LOOP_PHASES.map((p, i) => {
          const m = PHASE_META[p];
          const isActive = phase === p;
          const isVisited = visited.has(p);
          return (
            <div key={p} style={{ display: "contents" }}>
              <div
                className={`node ${isActive ? "active" : ""} ${isVisited ? "visited" : ""}`}
                style={{ color: m.color, borderColor: isActive ? m.color : undefined }}
              >
                <div className="nl" style={{ color: isActive ? m.color : undefined }}>{m.label}</div>
                <div className="nd">{m.desc}</div>
              </div>
              {i < LOOP_PHASES.length - 1 && <div className="arrow">→</div>}
            </div>
          );
        })}
      </div>

      <div className="grid">
        {/* Trace */}
        <div className="panel">
          <h3>Execution Trace (replayable)</h3>
          <div className="trace" ref={traceRef}>
            {(snap?.events ?? []).map((e, i) => (
              <div className="row" key={i}>
                <span className="ts">{e.ts.toFixed(2)}s</span>
                <span className="ev">{e.event}</span>
                <span className="dt">{e.detail ?? ""}</span>
              </div>
            ))}
            {!snap && <div style={{ color: "var(--muted)", padding: "8px 0" }}>Run an objective to see the live trace…</div>}
          </div>
        </div>

        {/* State */}
        <div className="panel">
          <h3>Loop State</h3>
          <div className="metrics">
            <div className="metric"><div className="v">{snap?.steps ?? 0}</div><div className="l">Steps</div></div>
            <div className="metric"><div className="v">${(snap?.costUsd ?? 0).toFixed(4)}</div><div className="l">Cost</div></div>
            <div className="metric"><div className="v">{((snap?.confidence ?? 0) * 100).toFixed(0)}%</div><div className="l">Confidence</div></div>
          </div>

          <div style={{ marginTop: 14, fontSize: 13, color: "var(--muted)" }}>
            Current phase: <b style={{ color: meta.color }}>{meta.label}</b> — {meta.desc}
          </div>

          {terminal && (
            <div className="result">
              <span
                className="badge"
                style={{
                  background: phase === "done" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                  color: phase === "done" ? "var(--green)" : "var(--amber)",
                }}
              >
                {phase === "done" ? "✓ VERIFIED & COMMITTED" : "⚠ ESCALATED TO HUMAN"}
              </span>
              <div className="answer">{snap?.result ?? "Budget exhausted — handed off for human review."}</div>
            </div>
          )}
        </div>
      </div>

      <footer className="footer">
        <div>
          <a href="https://github.com/devtechedge/aarop" target="_blank" rel="noreferrer">Source &amp; Architecture →</a>
        </div>
        <p className="disclaimer">
          This live demo runs the full agentic-loop logic <b>entirely in your browser</b> using a deterministic
          mock model provider — so it is instant, free, and always available. The production reference stack
          (Temporal, vLLM, pgvector, OpenTelemetry, Kubernetes) and the full test suite are documented in the
          repository. © 2026 Devayan Mandal.
        </p>
      </footer>
    </div>
  );
}
