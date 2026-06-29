/**
 * AAROP — Agentic Loop Engine (TypeScript port).
 *
 * Faithful, dependency-free port of the Python reference core
 * (github.com/devtechedge/aarop). The loop is an explicit, inspectable state
 * machine: Perceive -> Plan -> Act -> Observe -> Reflect -> Adapt. It runs
 * fully client-side with a deterministic mock model provider, so the demo is
 * instant, free, and never times out — while preserving the exact phase
 * transitions, budgets, tool validation, and verification of production.
 */

export type Phase =
  | "perceive" | "plan" | "act" | "observe"
  | "reflect" | "adapt" | "done" | "failed" | "escalated";

export interface Budget {
  maxSteps: number;
  maxCostUsd: number;
  maxSeconds: number;
}

export interface TraceEvent {
  ts: number;
  event: string;
  phase?: Phase;
  detail?: string;
  cost?: number;
  [k: string]: unknown;
}

export interface LoopSnapshot {
  runId: string;
  objective: string;
  phase: Phase;
  steps: number;
  costUsd: number;
  confidence: number;
  plan: Task[];
  scratchpad: { task: Task; result: ToolResult }[];
  result: string | null;
  events: TraceEvent[];
  history: { from: Phase; to: Phase; note?: string }[];
}

export interface Task { tool: string; args: Record<string, unknown>; }
export type ToolResult = { result: unknown } | { error: string };

// ---------- deterministic mock model provider ----------
function mockComplete(prompt: string): { text: string; cost: number } {
  let h = 0;
  for (let i = 0; i < prompt.length; i++) h = (h * 31 + prompt.charCodeAt(i)) >>> 0;
  const tokens = Math.min(256, Math.max(16, Math.floor(prompt.length / 4)));
  const cost = (tokens / 1000) * 0.0005;
  return { text: `[mock-llm:${h.toString(16).slice(0, 8)}] ${prompt.slice(0, 48)}`, cost: +cost.toFixed(6) };
}

// ---------- tool registry (validated, sandboxed) ----------
function safeCalc(expr: string): number {
  if (!/^[0-9+\-*/(). ]+$/.test(expr)) throw new Error("unsafe expression");
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${expr});`)() as number;
}

const KB: Record<string, string> = {
  "agentic loop": "Perceive, Plan, Act, Observe, Reflect, Adapt.",
  react: "Reasoning + Acting interleaved with tool use.",
  rag: "Retrieval-Augmented Generation grounds answers in retrieved context.",
};

function callTool(task: Task): ToolResult {
  try {
    if (task.tool === "calculator") {
      const expr = String(task.args.expression ?? "");
      if (!expr.trim()) throw new Error("missing required arg: expression");
      return { result: safeCalc(expr) };
    }
    if (task.tool === "kb_lookup") {
      const q = String(task.args.query ?? "").toLowerCase();
      const hit = Object.keys(KB).find((k) => q.includes(k));
      return { result: hit ? KB[hit] : "no entry found" };
    }
    return { error: `unknown tool '${task.tool}'` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------- planner ----------
function plan(objective: string): { tasks: Task[]; cost: number } {
  const { cost } = mockComplete(`plan: ${objective}`);
  const obj = objective.toLowerCase();
  const isMath = /[0-9].*[+\-*/]/.test(objective) || /calculate|sum|multiply|add/.test(obj);
  if (isMath) {
    const expr = (objective.match(/[0-9+\-*/(). ]+/g) || ["1+1"]).join("").trim() || "1+1";
    return { tasks: [{ tool: "calculator", args: { expression: expr } }], cost };
  }
  return { tasks: [{ tool: "kb_lookup", args: { query: objective } }], cost };
}

// ---------- verifier / critic ----------
function verify(scratchpad: LoopSnapshot["scratchpad"]) {
  if (scratchpad.length === 0)
    return { accepted: false, confidence: 0, reason: "no work produced", answer: null as string | null };
  const last = scratchpad[scratchpad.length - 1].result;
  if ("error" in last)
    return { accepted: false, confidence: 0.2, reason: last.error, answer: null };
  const val = last.result;
  const empty = val === null || val === "" || val === "no entry found";
  const confidence = empty ? 0.4 : 0.9;
  return {
    accepted: confidence >= 0.6,
    confidence,
    reason: confidence >= 0.6 ? "ok" : "low-confidence result",
    answer: String(val),
  };
}

// ---------- the loop, exposed as a generator so the UI can animate steps ----------
const uid = () => Math.random().toString(36).slice(2, 10);

export function* runAgenticLoop(
  objective: string,
  budget: Budget = { maxSteps: 8, maxCostUsd: 0.5, maxSeconds: 30 }
): Generator<LoopSnapshot, LoopSnapshot, void> {
  const start = Date.now();
  const s: LoopSnapshot = {
    runId: uid(), objective, phase: "perceive", steps: 0, costUsd: 0,
    confidence: 0, plan: [], scratchpad: [], result: null, events: [], history: [],
  };

  const emit = (event: string, extra: Partial<TraceEvent> = {}) =>
    s.events.push({ ts: +((Date.now() - start) / 1000).toFixed(3), event, phase: s.phase, ...extra });

  const transition = (to: Phase, note?: string) => {
    emit("phase_transition", { detail: `${s.phase} → ${to}${note ? ` (${note})` : ""}` });
    s.history.push({ from: s.phase, to, note });
    s.phase = to;
  };

  const budgetExceeded = (): string | null => {
    if (s.steps >= budget.maxSteps) return `step budget (${s.steps}/${budget.maxSteps})`;
    if (s.costUsd >= budget.maxCostUsd) return `cost budget`;
    if ((Date.now() - start) / 1000 >= budget.maxSeconds) return `time budget`;
    return null;
  };

  emit("loop_start", { detail: objective });
  yield { ...s };

  while (!["done", "failed", "escalated"].includes(s.phase)) {
    const over = budgetExceeded();
    if (over && s.phase !== "reflect") { transition("escalated", `budget: ${over}`); yield { ...s }; break; }

    switch (s.phase) {
      case "perceive": {
        emit("memory_recall", { detail: "retrieved 0 prior episodes (cold start)" });
        transition("plan");
        break;
      }
      case "plan": {
        const { tasks, cost } = plan(s.objective);
        s.plan = tasks; s.costUsd = +(s.costUsd + cost).toFixed(6);
        emit("plan_built", { detail: `${tasks.length} task(s): ${tasks.map((t) => t.tool).join(", ")}`, cost });
        transition("act");
        break;
      }
      case "act": {
        s.steps += 1;
        const task = s.plan[0] ?? { tool: "noop", args: {} };
        const result = callTool(task);
        const { cost } = mockComplete(`act: ${task.tool}`);
        s.costUsd = +(s.costUsd + cost).toFixed(6);
        s.scratchpad.push({ task, result });
        emit("tool_call", { detail: `${task.tool}(${JSON.stringify(task.args)})`, cost, ok: !("error" in result) });
        transition("observe", task.tool);
        break;
      }
      case "observe": {
        const last = s.scratchpad[s.scratchpad.length - 1]?.result;
        const anomaly = !last || "error" in (last as object);
        emit("observe", { detail: anomaly ? "anomaly detected" : "result captured" });
        transition("reflect");
        break;
      }
      case "reflect": {
        const v = verify(s.scratchpad);
        s.confidence = v.confidence;
        emit("verify", { detail: `accepted=${v.accepted} confidence=${v.confidence} (${v.reason})` });
        if (v.accepted) { s.result = v.answer; emit("memory_commit", { detail: "result committed to episodic memory" }); transition("done", `confidence ${v.confidence}`); }
        else transition("adapt", v.reason);
        break;
      }
      case "adapt": {
        const over = budgetExceeded();
        if (over) { transition("escalated", `budget: ${over}`); break; }
        if (s.plan.length) s.plan.shift();
        emit("replan", { detail: "dropped failed task, replanning" });
        transition(s.plan.length ? "plan" : "perceive");
        break;
      }
    }
    yield { ...s };
  }

  emit("loop_complete", { detail: `phase=${s.phase} steps=${s.steps} cost=$${s.costUsd.toFixed(4)} confidence=${s.confidence}` });
  return { ...s };
}

export const PHASE_META: Record<Phase, { label: string; color: string; desc: string }> = {
  perceive: { label: "Perceive", color: "#6366f1", desc: "Normalize input + recall memory (RAG)" },
  plan:     { label: "Plan",     color: "#8b5cf6", desc: "Build a cost-aware task graph" },
  act:      { label: "Act",      color: "#ec4899", desc: "Invoke validated, sandboxed tools" },
  observe:  { label: "Observe",  color: "#f59e0b", desc: "Capture results + detect anomalies" },
  reflect:  { label: "Reflect",  color: "#10b981", desc: "Critic verifies against acceptance criteria" },
  adapt:    { label: "Adapt",    color: "#ef4444", desc: "Replan / retry / escalate to human" },
  done:     { label: "Done",     color: "#059669", desc: "Accepted — committed to memory" },
  failed:   { label: "Failed",   color: "#dc2626", desc: "Unrecoverable failure" },
  escalated:{ label: "Escalated",color: "#d97706", desc: "Budget exhausted — human-in-the-loop" },
};
