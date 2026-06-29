"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  runAgenticLoop, realComplete, PHASE_META, AGENT_META,
  type LoopSnapshot, type Phase, type AgentRole, type Budget,
} from "@/lib/aarop";
import ThemeToggle from "@/components/ThemeToggle";

const LOOP_PHASES: Phase[] = ["perceive", "plan", "act", "observe", "reflect", "adapt"];
const AGENTS: AgentRole[] = ["orchestrator", "researcher", "coder", "analyst", "verifier", "memory"];

const SCENARIOS = [
  { label: "🧮 Compute", obj: "calculate (15 + 5) * 3", opts: {} },
  { label: "📚 Research + synthesize (multi-agent)", obj: "research the agentic loop and rag and explain", opts: {} },
  { label: "🏗️ Design task (multi-agent)", obj: "design a system using temporal and vllm and pgvector", opts: {} },
  { label: "💥 Failure → retry → escalate", obj: "calculate 42 / 6", opts: { injectFailure: true } },
  { label: "⛔ Budget exhaustion → escalate", obj: "research rag and temporal and vllm and pgvector and react", opts: { budget: { maxSteps: 2, maxCostUsd: 0.5, maxSeconds: 30 } as Budget } },
];

export default function Page() {
  const [objective, setObjective] = useState("research the agentic loop and rag and explain");
  const [snap, setSnap] = useState<LoopSnapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [useRealLLM, setUseRealLLM] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [llmOut, setLlmOut] = useState<string | null>(null);
  const traceRef = useRef<HTMLDivElement>(null);

  const run = useCallback(async (obj: string, opts: any = {}) => {
    if (!obj.trim() || running) return;
    setRunning(true); setSnap(null); setLlmOut(null);
    const gen = runAgenticLoop(obj.trim(), opts);
    let finalSnap: LoopSnapshot | null = null;
    for (const sres of gen) { finalSnap = sres; setSnap({ ...sres, events: [...sres.events] }); await new Promise((r) => setTimeout(r, 560)); }

    // optional real-LLM narration of the result
    if (useRealLLM && apiKey.trim() && finalSnap?.result) {
      try {
        setLlmOut("calling LLM…");
        const { text } = await realComplete(`In one sentence, explain this agent result to a recruiter: "${finalSnap.result}"`, apiKey.trim());
        setLlmOut(text);
      } catch (e) { setLlmOut("⚠️ " + (e as Error).message); }
    }
    setRunning(false);
  }, [running, useRealLLM, apiKey]);

  useEffect(() => { if (traceRef.current) traceRef.current.scrollTop = traceRef.current.scrollHeight; }, [snap]);

  const phase = snap?.phase ?? "perceive";
  const visited = new Set(snap?.history.flatMap((h) => [h.from, h.to]) ?? []);
  const terminal = phase === "done" || phase === "escalated" || phase === "failed";
  const meta = PHASE_META[phase];
  const activeAgents = new Set(snap?.activeAgents ?? ["orchestrator"]);

  const exportTrace = () => {
    if (!snap) return;
    const blob = new Blob([JSON.stringify({ objective: snap.objective, runId: snap.runId, events: snap.events, result: snap.result }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `aarop-trace-${snap.runId}.json`; a.click();
  };

  return (
    <>
    <nav className="nav">
      <div className="nav-inner">
        <a className="brand" href="#top">
          <svg className="logo" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--primary)" />
                <stop offset="1" stopColor="var(--accent)" />
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="20" fill="none" stroke="url(#lg)" strokeWidth="5" />
            <path d="M44 24 L53 17" stroke="url(#lg)" strokeWidth="5" strokeLinecap="round" />
            <circle cx="32" cy="32" r="6" fill="url(#lg)" />
          </svg>
          AAROP
        </a>
        <div className="nav-actions">
          <a className="nav-link" href="https://github.com/devtechedge/aarop" target="_blank" rel="noreferrer">GitHub</a>
          <ThemeToggle />
          <button className="cta-sm" onClick={() => run(objective)}>Run the demo ▶</button>
        </div>
      </div>
    </nav>

    <div className="wrap" id="top">
      <header className="hero">
        <span className="kicker">Live Demo · Agentic Loop Engineering</span>
        <h1 className="title">AAROP</h1>
        <p className="subtitle">
          An autonomous <b>multi-agent</b> reasoning system. Watch objectives flow through the full agentic loop —
          <b> Perceive → Plan → Act → Observe → Reflect → Adapt</b> — with delegated worker agents, self-verification,
          resilient recovery, bounded autonomy, and a replayable trace.
        </p>
        <p className="byline">
          Built by <b>Devayan Mandal</b> · <a href="https://github.com/devtechedge/aarop" target="_blank" rel="noreferrer">github.com/devtechedge/aarop</a>
        </p>
        <div className="hero-ctas">
          <button className="btn" onClick={() => run(objective)} disabled={running}>{running ? "Running…" : "Run the demo ▶"}</button>
          <a className="btn ghost" href="https://github.com/devtechedge/aarop" target="_blank" rel="noreferrer">View source →</a>
        </div>
      </header>

      {/* ===== SECTION 1: LIVE LOOP ===== */}
      <section className="section">
        <h2 className="sh">1 · Live Agentic Loop</h2>
        <div className="controls">
          <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Enter an objective…"
            onKeyDown={(e) => e.key === "Enter" && run(objective)} disabled={running} />
          <button className="btn" onClick={() => run(objective)} disabled={running}>{running ? "Running…" : "Run Agent ▶"}</button>
        </div>
        <div className="examples">
          {SCENARIOS.map((s) => (
            <span key={s.label} className="chip" onClick={() => { setObjective(s.obj); run(s.obj, s.opts); }}>{s.label}</span>
          ))}
        </div>

        {/* loop ribbon */}
        <div className="ribbon">
          {LOOP_PHASES.map((p, i) => {
            const m = PHASE_META[p];
            const isActive = phase === p, isVisited = visited.has(p);
            return (
              <div key={p} style={{ display: "contents" }}>
                <div className={`node ${isActive ? "active" : ""} ${isVisited ? "visited" : ""}`}
                  style={{ color: m.color, borderColor: isActive ? m.color : undefined }}>
                  <div className="nl" style={{ color: isActive ? m.color : undefined }}>{m.label}</div>
                  <div className="nd">{m.desc}</div>
                </div>
                {i < LOOP_PHASES.length - 1 && <div className="arrow">→</div>}
              </div>
            );
          })}
        </div>

        <div className="grid">
          <div className="panel">
            <div className="ph-row"><h3>Execution Trace (replayable)</h3>{snap && <button className="mini" onClick={exportTrace}>⬇ Export JSON</button>}</div>
            <div className="trace" ref={traceRef}>
              {(snap?.events ?? []).map((e, i) => (
                <div className="row" key={i}>
                  <span className="ts">{e.ts.toFixed(2)}s</span>
                  <span className="ev" style={{ color: e.ok === false ? "#ef4444" : undefined }}>{e.event}</span>
                  <span className="dt">{e.agent ? <b style={{ color: AGENT_META[e.agent].color }}>[{AGENT_META[e.agent].label}] </b> : null}{e.detail ?? ""}</span>
                </div>
              ))}
              {!snap && <div style={{ color: "var(--muted)", padding: "8px 0" }}>Run a scenario above to see the live trace…</div>}
            </div>
          </div>

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
                <span className="badge" style={{ background: phase === "done" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", color: phase === "done" ? "var(--green)" : "var(--amber)" }}>
                  {phase === "done" ? "✓ VERIFIED & COMMITTED" : "⚠ ESCALATED TO HUMAN"}
                </span>
                <div className="answer">{snap?.result ?? "Recovery exhausted — handed off for human review (bounded autonomy)."}</div>
              </div>
            )}

            {/* real-LLM toggle */}
            <div className="llm">
              <label className="llm-toggle"><input type="checkbox" checked={useRealLLM} onChange={(e) => setUseRealLLM(e.target.checked)} /> Use a real LLM (bring your own OpenAI key)</label>
              {useRealLLM && <input className="key" type="password" placeholder="sk-… (kept in your browser only)" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />}
              {llmOut && <div className="llm-out"><b>LLM narration:</b> {llmOut}</div>}
              {useRealLLM && <div className="note">Your key never leaves the browser — it calls OpenAI directly from your machine for one narration step only.</div>}
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 2: MULTI-AGENT FAN-OUT ===== */}
      <section className="section">
        <h2 className="sh">2 · Multi-Agent Orchestration</h2>
        <p className="sp">The Orchestrator decomposes the objective and delegates to specialized worker agents. Agents light up as they engage during a run.</p>
        <div className="agents">
          {AGENTS.map((a) => {
            const m = AGENT_META[a];
            const on = activeAgents.has(a);
            return (
              <div key={a} className={`agent ${on ? "on" : ""}`} style={{ borderColor: on ? m.color : undefined, color: m.color }}>
                <div className="al" style={{ color: on ? m.color : "var(--text)" }}>{m.label}{on && <span className="pulse" style={{ background: m.color }} />}</div>
                <div className="ad">{m.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== SECTION 3: ARCHITECTURE ===== */}
      <section className="section">
        <h2 className="sh">3 · System Architecture</h2>
        <p className="sp">Production reference stack — every demo component maps to a real backend.</p>
        <div className="panel arch">
          <svg viewBox="0 0 760 360" width="100%" style={{ maxWidth: 760 }} xmlns="http://www.w3.org/2000/svg" fontFamily="ui-sans-serif, system-ui" fontSize="13">
            <rect x="180" y="10" width="400" height="40" rx="9" fill="#1e1b4b" stroke="#6366f1"/>
            <text x="380" y="35" textAnchor="middle" fill="#c7d2fe" fontWeight="700">API Gateway · auth · budget · schema validation</text>
            <rect x="120" y="78" width="230" height="44" rx="9" fill="#312e81" stroke="#8b5cf6"/>
            <text x="235" y="105" textAnchor="middle" fill="#fff" fontWeight="700">Orchestrator (Agentic Loop)</text>
            <rect x="410" y="78" width="230" height="44" rx="9" fill="#3730a3" stroke="#8b5cf6"/>
            <text x="525" y="105" textAnchor="middle" fill="#fff" fontWeight="700">Workflow Engine (Temporal)</text>
            {[["Worker Agents", "vLLM / OpenAI"], ["Tool Registry", "sandboxed"], ["Memory", "pgvector / Qdrant"], ["Model Router", "cloud + self-host"]].map((t, i) => (
              <g key={i}>
                <rect x={30 + i * 180} y="150" width="160" height="56" rx="9" fill="#0f1422" stroke="#6366f1"/>
                <text x={110 + i * 180} y="174" textAnchor="middle" fill="#c7d2fe" fontWeight="700">{t[0]}</text>
                <text x={110 + i * 180} y="192" textAnchor="middle" fill="#8a93a6" fontSize="11">{t[1]}</text>
              </g>
            ))}
            <rect x="160" y="240" width="440" height="44" rx="9" fill="#0f766e" stroke="#14b8a6"/>
            <text x="380" y="267" textAnchor="middle" fill="#fff" fontWeight="700">Observability (OpenTelemetry) · Eval Harness · FinOps</text>
            <g stroke="#475569" strokeWidth="1.5" fill="none">
              <line x1="380" y1="50" x2="235" y2="78"/><line x1="380" y1="50" x2="525" y2="78"/>
              <line x1="235" y1="122" x2="110" y2="150"/><line x1="235" y1="122" x2="290" y2="150"/>
              <line x1="235" y1="122" x2="470" y2="150"/><line x1="235" y1="122" x2="650" y2="150"/>
              <line x1="380" y1="206" x2="380" y2="240"/>
            </g>
          </svg>
        </div>
        <p className="sp" style={{ textAlign: "center" }}>
          Full C4 diagrams, sequence diagrams & 5 ADRs in <a href="https://github.com/devtechedge/aarop/blob/main/core/docs/ARCHITECTURE.md" target="_blank" rel="noreferrer">ARCHITECTURE.md</a>.
        </p>
      </section>

      {/* ===== SECTION 4: WHY IT'S ENGINEERED RIGHT ===== */}
      <section className="section">
        <h2 className="sh">4 · Engineering Rigor</h2>
        <div className="cards">
          {[
            ["Bounded Autonomy", "Step / cost / time budgets; escalates to a human instead of looping forever. Try the budget scenario above."],
            ["Resilient Recovery", "Tool retries, circuit breaker, anomaly detection in Observe. Try the failure scenario above."],
            ["Self-Verification", "A critic agent scores every result against acceptance criteria before commit."],
            ["Multi-Agent", "Orchestrator delegates to Researcher / Coder / Analyst / Verifier / Memory agents."],
            ["Observability", "Structured, replayable trace per run — exportable as JSON."],
            ["Tested Core", "9 tests, 92% coverage on the Python core; CI runs Python 3.10–3.12 + the Next.js build."],
          ].map(([t, d]) => (
            <div key={t} className="card"><h4>{t}</h4><p>{d}</p></div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <div><a href="https://github.com/devtechedge/aarop" target="_blank" rel="noreferrer">Source &amp; Architecture →</a></div>
        <p className="disclaimer">
          This demo runs the full agentic-loop & multi-agent logic <b>entirely in your browser</b> with a deterministic mock provider — instant, free, always online.
          The production reference stack (Temporal, vLLM, pgvector, OpenTelemetry, Kubernetes) and the 92%-tested Python core are in the repository. © 2026 Devayan Mandal.
        </p>
      </footer>
    </div>
    </>
  );
}
