import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  plan,
  runAgenticLoop,
  safeCalc,
  verify,
  type LoopSnapshot,
} from "./aarop.ts";

function drain(objective: string, opts: Parameters<typeof runAgenticLoop>[1] = {}) {
  let last: LoopSnapshot | undefined;
  for (const snap of runAgenticLoop(objective, opts)) last = snap;
  return last!;
}

describe("safeCalc", () => {
  it("evaluates a charset-allowed expression", () => {
    assert.equal(safeCalc("21*2 + 8"), 50);
    assert.equal(safeCalc("(15 + 5) * 3"), 60);
  });

  it("rejects unsafe expressions", () => {
    assert.throws(() => safeCalc("__import__('os')"), /unsafe expression/);
    assert.throws(() => safeCalc("process.exit(1)"), /unsafe expression/);
    assert.throws(() => safeCalc(""), /unsafe expression/);
  });
});

describe("plan", () => {
  it("builds a calculator task for math objectives", () => {
    const { tasks } = plan("calculate 21*2 + 8");
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].tool, "calculator");
    assert.equal(tasks[0].agent, "coder");
  });

  it("fans out research + synthesize for multi-agent objectives", () => {
    const { tasks } = plan("research the agentic loop and rag and explain");
    assert.ok(tasks.some((t) => t.tool === "kb_lookup" && t.agent === "researcher"));
    assert.ok(tasks.some((t) => t.tool === "synthesize" && t.agent === "analyst"));
  });
});

describe("verify", () => {
  it("rejects empty work", () => {
    const v = verify([]);
    assert.equal(v.accepted, false);
    assert.equal(v.reason, "no work produced");
  });

  it("rejects tool errors", () => {
    const v = verify([
      {
        task: { tool: "calculator", agent: "coder", args: {}, label: "x" },
        result: { error: "boom" },
        attempts: 1,
      },
    ]);
    assert.equal(v.accepted, false);
    assert.equal(v.reason, "boom");
  });
});

describe("runAgenticLoop", () => {
  it("completes a calculation and commits a result", () => {
    const snap = drain("calculate 21*2 + 8");
    assert.equal(snap.phase, "done");
    assert.equal(snap.result, "50");
    assert.ok(snap.confidence >= 0.6);
    assert.ok(snap.history.some((h) => h.to === "reflect"));
  });

  it("escalates when the circuit breaker trips", () => {
    const snap = drain("calculate 42 / 6", { injectFailure: true });
    assert.equal(snap.phase, "escalated");
    assert.equal(snap.result, null);
  });

  it("escalates when the step budget is exhausted", () => {
    const snap = drain("research rag and temporal and vllm", {
      budget: { maxSteps: 1, maxCostUsd: 0.5, maxSeconds: 30 },
    });
    assert.equal(snap.phase, "escalated");
  });
});
