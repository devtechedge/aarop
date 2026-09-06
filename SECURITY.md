# Security Assessment — AAROP

**Date:** 2026-09-06  
**Scope:** Auth, XSS, injection, secrets, CORS, supply chain, Python tool sandbox  
**Context:** Public deploy is a **100% client-side Next.js demo** ([aarop.vercel.app](https://aarop.vercel.app/)). The Python `core/` engine is an **offline reference implementation** (no network, no API keys).

---

## Executive summary

| Area | Risk | Notes |
|------|------|--------|
| Authentication | **N/A (by design)** | No login, no sessions, no cookies |
| Authorization | **N/A** | No roles, no mutating API |
| XSS | **Low** | Objectives and traces render as React text. One static `dangerouslySetInnerHTML` for the theme no-flash script |
| Injection (SQL) | **N/A** | No database on either path |
| Calculator / `eval` | **Low (mitigated)** | Charset allow-list + empty `__builtins__` (Python) / `Function` constructor (TS) |
| Secrets in repo | **Low** | No `.env` committed. Optional OpenAI key is typed in the browser and never sent to AAROP servers |
| CORS | **N/A** | No first-party API routes |
| Supply chain | **Accepted (Next 14)** | Stay on Next **14.x**. Do not `--force` onto 15/16 |
| Build config | **OK** | No `ignoreBuildErrors`. `tsc --noEmit` in CI |
| HTTP headers | **Added** | CSP, frame deny, nosniff, referrer, permissions (2026-09-06) |

**Overall (public Vercel demo):** Low residual risk — browser-only simulation, deterministic mock provider, no backend secrets, no auth boundary to break. Not a claim of being unhackable; there is simply little server surface. Headers reduce casual XSS framing / MIME sniff risks.

**Overall (if someone pointed the Python engine at untrusted tools or a public network):** Medium — the demo `eval` calculator is charset-gated, not a real sandbox (no seccomp / containers).

---

## 1. Authentication & session

**Findings**
- Neither the live demo nor the Python core implements login, cookies, JWT, or NextAuth.
- There is no user data, no profile, and no mutating server.

**Verdict:** Auth is intentionally absent. Do not claim “secured with NextAuth” or JWT.

---

## 2. XSS

**Findings**
- User-supplied objectives, trace lines, and tool results render as React text nodes → default escaping.
- The only `dangerouslySetInnerHTML` is the **static** theme no-flash script in `web-demo/app/layout.tsx`. It interpolates no user input.
- Trace JSON export is a client-side `Blob` download, not injected into the DOM as HTML.

**Verdict:** Low. Do not pipe untrusted markdown through `dangerouslySetInnerHTML` later.

---

## 3. Injection (calculator / tools)

### Python `core/`

`core/src/aarop/tools/registry.py` evaluates arithmetic via:

```python
if not set(expr) <= set("0123456789+-*/(). "):
    raise ValueError("unsafe expression")
return eval(expr, {"__builtins__": {}}, {})
```

Charset allow-list **and** empty builtins. `__import__('os')` is rejected by the existing unit test.

This is **not** a production sandbox. A real deployment should run tools in seccomp/containers (see `core/docs/ARCHITECTURE.md`).

### TypeScript live demo

`web-demo/lib/aarop.ts` uses `/^[0-9+\-*/(). ]+$/` and `Function('"use strict"; return (…)')()`. Same allow-list. Client-side only — a crafted expression cannot reach a server.

Unknown tools return `{ error }`. Required args are validated before dispatch.

---

## 4. Optional “bring your own OpenAI key”

The live demo can send **one** narration request to `https://api.openai.com/v1/chat/completions` from the **browser**.

**Accepted residual risk**
- The key lives in React state (`type="password"`). It is not written to `localStorage`, not posted to AAROP, and not logged.
- Anyone who pastes a real key into a public demo is trusting their own browser and OpenAI. Treat that as the user’s choice, not AAROP collecting credentials.

**Do not** add a server-side proxy that forwards keys. Do not commit keys.

---

## 5. HTTP hardening (2026-09-06)

Headers in `web-demo/next.config.mjs`:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- CSP: `default-src 'self'`; script/style `'unsafe-inline'` (Next); `connect-src 'self' https://api.openai.com` (BYOK only); `frame-ancestors 'none'`; `object-src 'none'`

No first-party API routes to rate-limit. OpenAI key stays in React state (not localStorage) and is sent only to `api.openai.com`.

---

## 6. HTTP surface

| Path | Auth | Notes |
|------|------|--------|
| `/` live demo | None | Client-side agentic loop |
| Python `examples/run_demo.py` | None | Offline CLI, no bind |

No `app/api/` routes. No Socket.io. No hello-world placeholder APIs.

`next.config.mjs` has `reactStrictMode: true` and does **not** set `output: "standalone"` (correct for Vercel). TypeScript `ignoreBuildErrors` is unset (defaults to fail).

---

## 7. Secrets & config hygiene

- Root and `web-demo/` `.gitignore` exclude `.env`, `.env.*`.
- No `.env.example` is required — the demo has no server secrets.
- CI uses no repository secrets.

---

## 8. Dependency / supply chain

**This pass**
- Web demo stays on **Next 14** (patched 14.2.x). Advisories that only clear on Next 15/16 are **accepted residual risk**.
- No Prisma, NextAuth, z.ai SDK, or unused Radix/shadcn template leftovers (this repo never had them).
- Runtime deps: `next`, `react`, `react-dom` only.
- Python runtime deps: **none**. Dev extras: `pytest`, `pytest-cov`.

```bash
cd web-demo && npm audit --omit=dev
cd core && pip install -e ".[dev]"
```

Do **not** run `npm audit fix --force` onto Next 15/16.

---

## 9. CORS & network

- Live demo is same-origin static/client. No CORS policy to get wrong.
- Python core makes **no** outbound calls (mock model provider).
- The optional browser→OpenAI call is a third-party fetch, not an AAROP API.

---

## 10. Residual risk & acceptance

**Accepted for portfolio demo**
- No authentication on the public site.
- Next 14 remaining advisories that require a major bump to clear.
- Charset-gated `eval` / `Function` calculator (demo only).
- Optional browser-held OpenAI key for one narration step.

**Not accepted if this becomes a hosted agent platform**
- Unsandboxed tool execution.
- Server-side LLM proxy without auth, budget, and secret storage.
- Binding any control-plane API to the public internet.

---

## 11. How to re-test

```bash
# Python core
cd core
pip install -e ".[dev]"
pytest --cov=aarop --cov-fail-under=85

# Web demo
cd web-demo
npm ci
npm test
npm run typecheck
npm run test:e2e
npm audit --omit=dev
```
