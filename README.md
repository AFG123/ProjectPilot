# ProjectPilot

AI-powered project-idea generator for Indian campus placements. Students enter their
skills and target role and get 5 specific, recruiter-relevant project ideas — then a
full, step-by-step **deep dive** (build plan, code for the tricky parts, common
mistakes, and interview questions) for any idea they choose.

- **All 5 ideas are free.** The deep dive is the product: the first one is free per
  account, and a one-time ₹49 unlocks unlimited deep dives forever.

## Features

- **Tailored ideas** — calibrated to your skill levels, target role, company, and time budget
- **Resume import** — upload a PDF to auto-extract skills
- **Project deep dive** — prerequisites, setup, folder structure, step-by-step build order,
  API routes, DB schema, common mistakes, and role-specific interview questions
- **Google sign-in** — JWT in an httpOnly cookie
- **One-time ₹49 unlock** — Razorpay, with signature-verified payments + webhook reconciliation
- **Caching** — deep dives are stored per user so they never regenerate (server + browser)

## Tech stack

| Layer     | Tech                                                            |
|-----------|-----------------------------------------------------------------|
| Frontend  | React 19, Vite, Tailwind CSS, React Router                      |
| Backend   | Node.js, Express 5                                              |
| Database  | PostgreSQL (Neon serverless)                                    |
| AI        | Google Gemini (`gemini-2.5-flash-lite`)                         |
| Auth      | Google OAuth → own JWT (httpOnly cookie)                        |
| Payments  | Razorpay (order + HMAC verify + webhook)                        |
| Security  | helmet, CORS allowlist, rate limiting, Origin-based CSRF guard  |

## Project structure

```
.
├── server.js              # entry point — binds process.env.PORT
├── scripts/
│   └── init-db.js         # idempotent schema setup (run once)
├── src/
│   ├── app.js             # Express app: middleware, CORS, routes
│   ├── db.js              # pg Pool (Neon)
│   ├── controllers/       # request handlers (auth, generate, deepDive, payment, resume…)
│   ├── routes/            # route definitions + validators
│   ├── services/          # aiService (Gemini), resumeService
│   ├── middleware/        # auth (JWT), csrf
│   └── utils/             # auth cookie/token helpers
└── client/                # React + Vite frontend
    ├── src/pages/         # Landing, Generate, DeepDive, Saved, legal
    ├── src/components/     # Navbar, AuthModal, UnlockButton
    └── src/context/       # AuthContext
```

## Getting started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (e.g. a free [Neon](https://neon.tech) project)
- Google OAuth client ID, Gemini API key, Razorpay keys

### 1. Backend
```bash
npm install
cp .env.example .env        # then fill in your values
node scripts/init-db.js     # creates the payments table (run once)
npm run dev                 # starts on http://localhost:3000
```

### 2. Frontend
```bash
cd client
npm install
cp .env.example .env        # then fill in your values
npm run dev                 # starts on http://localhost:5173
```

## Environment variables

**Backend (`.env`)**

| Variable                   | Description                                       |
|----------------------------|---------------------------------------------------|
| `DATABASE_URI`             | PostgreSQL connection string                      |
| `GEMINI_API_KEY`           | Google Gemini API key                             |
| `GOOGLE_CLIENT_ID`         | Google OAuth client ID (verifies sign-in tokens)  |
| `JWT_SECRET`               | Long random string for signing session JWTs       |
| `RAZORPAY_KEY_ID`          | Razorpay key id                                   |
| `RAZORPAY_KEY_SECRET`      | Razorpay key secret                               |
| `RAZORPAY_WEBHOOK_SECRET`  | Razorpay webhook secret (payment reconciliation)  |
| `CLIENT_URL`               | Frontend origin (CORS + CSRF allowlist)           |
| `NODE_ENV`                 | `production` in prod (enables secure cookies)     |
| `PORT`                     | Optional; host usually injects it                 |

**Frontend (`client/.env`)**

| Variable                 | Description                          |
|--------------------------|--------------------------------------|
| `VITE_API_URL`           | Backend base URL                     |
| `VITE_GOOGLE_CLIENT_ID`  | Google OAuth client ID               |

## Scripts

**Backend**
- `npm run dev` — start with nodemon
- `npm start` — start with node
- `node scripts/init-db.js` — set up the schema

**Frontend** (in `client/`)
- `npm run dev` — Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the build

## Deployment

- **Frontend** → Cloudflare Pages (build `npm run build`, output `dist`, root `client`).
  SPA routing is handled by `client/public/_redirects`.
- **Backend** → Railway. Set the env vars above with `NODE_ENV=production`.
- Register the Razorpay webhook (`payment.captured`) to `POST /api/payment/webhook`
  and set `RAZORPAY_WEBHOOK_SECRET`.

## License

ISC
