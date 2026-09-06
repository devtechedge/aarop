/**
 * AAROP — Agentic Loop Engine (TypeScript port, enhanced demo build).
 *
 * Faithful port of the Python reference core (github.com/devtechedge/aarop):
 * an explicit Perceive -> Plan -> Act -> Observe -> Reflect -> Adapt state
 * machine. This enhanced build adds, all client-side and deterministic:
 *   - multi-step plans that chain several tools / agents
 *   - multi-agent delegation metadata (which worker agent owns each task)
 *   - a failure-injection path to demonstrate retry / circuit-breaker / escalate
 *   - an optional real-LLM hook (bring-your-own-key) for a single generation step
 */

export type Phase =
  | "perceive" | "plan" | "act" | "observe"
  | "reflect" | "adapt" | "done" | "failed" | "escalated";

export type AgentRole = "orchestrator" | "researcher" | "coder" | "analyst" | "verifier" | "memory";

export interface Budget {
  maxSteps: number;
  maxCostUsd: number;
  maxSeconds: number;
}

export interface TraceEvent {
  ts: number;
  event: string;
  phase?: Phase;
  agent?: AgentRole;
  detail?: string;
  cost?: number;
  ok?: boolean;
  [k: string]: unknown;
}

export interface Task {
  tool: string;
  agent: AgentRole;
  args: Record<string, unknown>;
  label: string;
}

export type ToolResult = { result: unknown } | { error: string };

export interface LoopSnapshot {
  runId: string;
  objective: string;
  phase: Phase;
  steps: number;
  costUsd: number;
  confidence: number;
  plan: Task[];
  completed: { task: Task; result: ToolResult; attempts: number }[];
  result: string | null;
  events: TraceEvent[];
  history: { from: Phase; to: Phase; note?: string }[];
  activeAgents: AgentRole[];
}

// ---------- deterministic mock model provider ----------
function mockComplete(prompt: string): { text: string; cost: number } {
  let h = 0;
  for (let i = 0; i < prompt.length; i++) h = (h * 31 + prompt.charCodeAt(i)) >>> 0;
  const tokens = Math.min(256, Math.max(16, Math.floor(prompt.length / 4)));
  const cost = (tokens / 1000) * 0.0005;
  return { text: `[mock-llm:${h.toString(16).slice(0, 8)}] ${prompt.slice(0, 48)}`, cost: +cost.toFixed(6) };
}

// optional real LLM (bring-your-own-key); browser→OpenAI only — never logged to a first-party API / never localStorage
export async function realComplete(
  prompt: string, apiKey: string
): Promise<{ text: string; cost: number }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
    }),
  });
  if (!res.ok) throw new Error(`LLM error ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "(no content)";
  const tok = data.usage?.total_tokens ?? 200;
  return { text, cost: +((tok / 1000) * 0.00015).toFixed(6) };
}

// ---------- tools (validated, sandboxed) ----------
export function safeCalc(expr: string): number {
  if (!/^[0-9+\-*/(). ]+$/.test(expr)) throw new Error("unsafe expression");
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${expr});`)() as number;
}

const KB: Record<string, string> = {
  "agentic loop": "Perceive, Plan, Act, Observe, Reflect, Adapt — an explicit control loop.",
  react: "Reasoning + Acting interleaved with tool use.",
  rag: "Retrieval-Augmented Generation grounds answers in retrieved context.",
  temporal: "A durable workflow engine for crash-safe, replayable execution.",
  vllm: "A high-throughput inference server for self-hosted LLMs.",
  pgvector: "A Postgres extension enabling vector similarity search for RAG.",
};

function callTool(task: Task, forceFail = false): ToolResult {
  try {
    if (forceFail) throw new Error("simulated transient tool failure");
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
    if (task.tool === "synthesize") {
      const parts = (task.args.parts as string[]) ?? [];
      return { result: parts.filter(Boolean).join(" ") };
    }
    return { error: `unknown tool '${task.tool}'` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------- planner: builds multi-step, multi-agent plans ----------
export function plan(objective: string): { tasks: Task[]; cost: number } {
  const { cost } = mockComplete(`plan: ${objective}`);
  const obj = objective.toLowerCase();

  // research-style objective -> chained multi-agent plan
  if (/compare|research|summari|explain.*and|design|architect/.test(obj)) {
    const terms = Object.keys(KB).filter((k) => obj.includes(k));
    const lookups: Task[] = (terms.length ? terms : ["agentic loop", "rag"]).map((t) => ({
      tool: "kb_lookup", agent: "researcher", args: { query: t },
      label: `research "${t}"`,
    }));
    return {
      tasks: [
        ...lookups,
        { tool: "synthesize", agent: "analyst", args: { parts: [] }, label: "synthesize findings" },
      ],
      cost,
    };
  }

  const isMath = /[0-9].*[+\-*/]/.test(objective) || /calculate|sum|multiply|add/.test(obj);
  if (isMath) {
    const expr = (objective.match(/[0-9+\-*/(). ]+/g) || ["1+1"]).join("").trim() || "1+1";
    return { tasks: [{ tool: "calculator", agent: "coder", args: { expression: expr }, label: `compute ${expr}` }], cost };
  }
  return { tasks: [{ tool: "kb_lookup", agent: "researcher", args: { query: objective }, label: "look up concept" }], cost };
}

// ---------- verifier / critic ----------
export function verify(completed: LoopSnapshot["completed"]) {
  if (completed.length === 0)
    return { accepted: false, confidence: 0, reason: "no work produced", answer: null as string | null };
  const last = completed[completed.length - 1].result;
  if ("error" in last)
    return { accepted: false, confidence: 0.2, reason: last.error, answer: null };
  const val = last.result;
  const empty = val === null || val === "" || val === "no entry found";
  const confidence = empty ? 0.4 : 0.9;
  return {
    accepted: confidence >= 0.6,
    confidence,
    reason: confidence >= 0.6 ? "meets acceptance criteria" : "low-confidence result",
    answer: String(val),
  };
}

const uid = () => Math.random().toString(36).slice(2, 10);

export interface RunOptions {
  budget?: Budget;
  injectFailure?: boolean;   // demonstrate retry / circuit-breaker / escalate
}

export function* runAgenticLoop(
  objective: string,
  opts: RunOptions = {}
): Generator<LoopSnapshot, LoopSnapshot, void> {
  const budget = opts.budget ?? { maxSteps: 8, maxCostUsd: 0.5, maxSeconds: 30 };
  const start = Date.now();
  const s: LoopSnapshot = {
    runId: uid(), objective, phase: "perceive", steps: 0, costUsd: 0,
    confidence: 0, plan: [], completed: [], result: null, events: [], history: [],
    activeAgents: ["orchestrator"],
  };
  let failuresLeft = opts.injectFailure ? 3 : 0; // fail 3x to trip the breaker -> escalate

  const emit = (event: string, extra: Partial<TraceEvent> = {}) =>
    s.events.push({ ts: +((Date.now() - start) / 1000).toFixed(3), event, phase: s.phase, ...extra });

  const transition = (to: Phase, note?: string) => {
    emit("phase_transition", { agent: "orchestrator", detail: `${s.phase} → ${to}${note ? ` (${note})` : ""}` });
    s.history.push({ from: s.phase, to, note });
    s.phase = to;
  };

  const budgetExceeded = (): string | null => {
    if (s.steps >= budget.maxSteps) return `step budget (${s.steps}/${budget.maxSteps})`;
    if (s.costUsd >= budget.maxCostUsd) return `cost budget ($${s.costUsd.toFixed(3)}/$${budget.maxCostUsd})`;
    if ((Date.now() - start) / 1000 >= budget.maxSeconds) return `time budget`;
    return null;
  };

  emit("loop_start", { agent: "orchestrator", detail: objective });
  yield { ...s };

  let retryCount = 0;

  while (!["done", "failed", "escalated"].includes(s.phase)) {
    const over = budgetExceeded();
    if (over && s.phase !== "reflect") { transition("escalated", `budget: ${over}`); yield { ...s }; break; }

    switch (s.phase) {
      case "perceive": {
        s.activeAgents = ["orchestrator", "memory"];
        emit("memory_recall", { agent: "memory", detail: "retrieved 0 prior episodes (cold start)" });
        transition("plan");
        break;
      }
      case "plan": {
        const { tasks, cost } = plan(s.objective);
        s.plan = tasks; s.costUsd = +(s.costUsd + cost).toFixed(6);
        s.activeAgents = ["orchestrator", ...Array.from(new Set(tasks.map((t) => t.agent)))];
        emit("plan_built", {
          agent: "orchestrator",
          detail: `${tasks.length} task(s): ${tasks.map((t) => `${t.agent}:${t.tool}`).join(", ")}`,
          cost,
        });
        transition("act");
        break;
      }
      case "act": {
        s.steps += 1;
        const task = s.plan[0] ?? { tool: "noop", agent: "orchestrator", args: {}, label: "noop" };
        s.activeAgents = ["orchestrator", task.agent];

        // resolve synthesize inputs from prior successful results
        if (task.tool === "synthesize") {
          task.args.parts = s.completed
            .filter((c) => "result" in c.result)
            .map((c) => String((c.result as { result: unknown }).result));
        }

        const shouldFail = failuresLeft > 0;
        const result = callTool(task, shouldFail);
        const { cost } = mockComplete(`act:${task.agent}:${task.tool}`);
        s.costUsd = +(s.costUsd + cost).toFixed(6);

        if ("error" in result) {
          failuresLeft = Math.max(0, failuresLeft - 1);
          retryCount += 1;
          emit("tool_call", { agent: task.agent, detail: `${task.tool} → ERROR: ${result.error}`, cost, ok: false });
          emit("circuit_breaker", { agent: task.agent, detail: `failure ${retryCount}/3 recorded for ${task.tool}` });
          transition("observe", `error (retry ${retryCount})`);
        } else {
          s.completed.push({ task, result, attempts: retryCount + 1 });
          retryCount = 0;
          emit("tool_call", { agent: task.agent, detail: `${task.label} ✓`, cost, ok: true });
          transition("observe", task.tool);
        }
        break;
      }
      case "observe": {
        const last = s.completed[s.completed.length - 1]?.result;
        const lastEvent = s.events[s.events.length - 1];
        const anomaly = lastEvent?.event === "circuit_breaker" || !last || "error" in (last as object);
        emit("observe", { agent: "orchestrator", detail: anomaly ? "anomaly detected — entering recovery" : "result captured cleanly" });
        if (anomaly && retryCount >= 3) { transition("escalated", "circuit open — human-in-the-loop"); break; }
        transition(anomaly ? "adapt" : "reflect");
        break;
      }
      case "reflect": {
        // verify only when all planned tasks are done
        if (s.completed.length < s.plan.length) { transition("act", "more tasks pending"); break; }
        s.activeAgents = ["orchestrator", "verifier"];
        const v = verify(s.completed);
        s.confidence = v.confidence;
        emit("verify", { agent: "verifier", detail: `accepted=${v.accepted} confidence=${v.confidence} (${v.reason})` });
        if (v.accepted) {
          s.result = v.answer;
          emit("memory_commit", { agent: "memory", detail: "result committed to episodic memory" });
          transition("done", `confidence ${v.confidence}`);
        } else transition("adapt", v.reason);
        break;
      }
      case "adapt": {
        const over = budgetExceeded();
        if (over) { transition("escalated", `budget: ${over}`); break; }
        if (failuresLeft > 0) { emit("replan", { agent: "orchestrator", detail: "retrying failed task with backoff" }); transition("act", "retry"); break; }
        emit("replan", { agent: "orchestrator", detail: "task recovered / replanning" });
        transition("act");
        break;
      }
    }
    yield { ...s };
  }

  emit("loop_complete", {
    agent: "orchestrator",
    detail: `phase=${s.phase} steps=${s.steps} cost=$${s.costUsd.toFixed(4)} confidence=${s.confidence}`,
  });
  yield { ...s };
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
  escalated:{ label: "Escalated",color: "#d97706", desc: "Budget/breaker — human-in-the-loop" },
};

export const AGENT_META: Record<AgentRole, { label: string; color: string; desc: string }> = {
  orchestrator: { label: "Orchestrator", color: "#8b5cf6", desc: "Owns the global plan & delegates" },
  researcher:   { label: "Researcher",   color: "#3b82f6", desc: "Web / KB / RAG retrieval" },
  coder:        { label: "Coder",        color: "#ec4899", desc: "Code & computation execution" },
  analyst:      { label: "Analyst",      color: "#f59e0b", desc: "Data synthesis & analysis" },
  verifier:     { label: "Verifier",     color: "#10b981", desc: "Critic — gates every result" },
  memory:       { label: "Memory",       color: "#14b8a6", desc: "Episodic / semantic recall & commit" },
};
