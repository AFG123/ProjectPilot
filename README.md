# ProjectPilot 🚀

> AI-powered project idea generator for Indian CS students targeting campus placements.

**Live → [projectpilot.devbyaryan.me](https://projectpilot.devbyaryan.me)**

Enter your skills + target role → get 5 tailored, recruiter-relevant project ideas →
pick one → get a full deep dive (build plan, folder structure, API routes, DB schema,
interview questions).

---

## Why I built this

Every CS student Googling "projects for placement" gets the same 5 generic CRUD apps.
Recruiters have seen them 500 times. ProjectPilot gives you ideas calibrated to *your*
skill level, *your* target role, and what actually gets you hired.

---

## Features

- 🎯 **Tailored ideas** — role, company, skill level, and time budget aware
- 📄 **Resume import** — upload PDF to auto-extract your skills
- 🤖 **AI deep dive** — prerequisites, folder structure, step-by-step build order, API routes, DB schema, common mistakes, interview questions
- 🔐 **Google sign-in** — JWT in httpOnly cookie (no localStorage)
- 💳 **One-time ₹49 unlock** — Razorpay with HMAC signature verification + webhook reconciliation
- ⚡ **Smart caching** — deep dives stored per user, never regenerated

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL (Neon serverless) |
| AI | Google Gemini (`gemini-2.5-flash-lite`) |
| Auth | Google OAuth → JWT (httpOnly cookie) |
| Payments | Razorpay (order + HMAC verify + webhook) |
| Security | helmet, CORS allowlist, rate limiting, Origin-based CSRF guard |
| Deployment | Railway (backend) + Cloudflare Workers (frontend) |

---

## Architecture decisions worth noting

- **JWT in httpOnly cookies** (not localStorage) — prevents XSS token theft
- **Origin-based CSRF guard** instead of csurf — cleaner for SPA + REST API setup
- **PostgreSQL caching layer** — Gemini responses cached per user, cuts API cost to near zero on repeat visits
- **Razorpay webhook reconciliation** — payment state verified server-side, not just client callback

---

## Project Structure
