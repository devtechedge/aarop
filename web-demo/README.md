# 🚀 AAROP — Live Agentic Loop Demo

An interactive, browser-based walk-through of the **AAROP** autonomous multi-agent reasoning system. Enter an objective and watch it flow through the full agentic loop — **Perceive → Plan → Act → Observe → Reflect → Adapt** — with live tool calls, self-verification, budget guardrails, and a replayable execution trace.

> 🔗 **Core engine & architecture:** [github.com/devtechedge/aarop](https://github.com/devtechedge/aarop)

## ✨ What this demonstrates

- The complete **agentic loop as an explicit state machine** (not a hidden prompt chain)
- Live **execution trace** with phase transitions, tool calls, and verification events
- **Bounded autonomy** — step / cost / confidence metrics shown in real time
- A **Verifier/Critic gate** that accepts or escalates before committing a result

The loop logic in [`lib/aarop.ts`](lib/aarop.ts) is a faithful TypeScript port of the Python reference core. It runs **100% client-side** with a deterministic mock model provider — so the demo is instant, free, and never times out.

## 🧑‍💻 Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

## ▲ Deploy to Vercel (free)

1. Push this folder to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Framework preset: **Next.js** (auto-detected). No env vars needed.
4. Click **Deploy**. Done — you get a live `https://<project>.vercel.app` URL.

Because the demo is fully static/client-side, it deploys on Vercel's free Hobby tier with **no serverless timeout risk and no API costs**.

## 🧱 Tech

Next.js 14 (App Router) · React 18 · TypeScript · zero runtime dependencies beyond React/Next.

---
Built by **Devayan Mandal** · © 2026 · [github.com/devtechedge](https://github.com/devtechedge)
