# Replit setup (per fork)

This template is built to deploy on Replit Reserved VM. Per-project setup takes ~10 min.

## Prerequisites

- A Replit account (MLabs builds in MLabs account, transfers ownership at handover — see [`HANDOVER.md`](../../HANDOVER.md))
- Neon Postgres database URL (`DATABASE_URL` — see `.env.example`)
- Postmark server token (`POSTMARK_SERVER_TOKEN` — per-project, see [§3 below](#postmark))
- Replit Object Storage bucket (auto-created when you enable Object Storage in the Replit project)

## 1. Import the template

```bash
# Option A: import from GitHub
# In Replit: Create Repl → Import from GitHub → paste the template repo URL

# Option B: import from your fork
# In Replit: Create Repl → Import from GitHub → paste your fork URL
```

Replit auto-runs `npm install` on first import. This pulls native deps (sharp, etc.).

## 2. Configure secrets

In the Replit project: **Tools → Secrets**. Add each variable from `.env.example`:

- `DATABASE_URL` — your Neon connection string
- `BETTER_AUTH_SECRET` — generate with `openssl rand -base64 32`
- `BETTER_AUTH_URL` — your Replit deployment URL (set after first deploy)
- `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL` — per-project Postmark setup ([§3](#postmark))
- `REPLIT_OBJECT_STORAGE_BUCKET_ID` — bucket ID from Object Storage tool

## 3. Postmark <a id="postmark"></a>

This template uses **per-project Postmark servers** so each client owns their own deliverability reputation. At handover, the Postmark server transfers (or the client provisions their own) without rotating any other secrets.

Setup steps:

1. Log into [Postmark](https://account.postmarkapp.com/) (MLabs account during dev)
2. Create a new Server (one per project)
3. Add a Sender Signature for the from-email address (must be verified)
4. Copy the Server API Token to `POSTMARK_SERVER_TOKEN` in Replit Secrets
5. Set `POSTMARK_FROM_EMAIL` to the verified sender address
6. Templates: create `verify-email`, `password-reset`, `notification-generic` in Postmark UI (variable specs documented in `src/lib/email/templates.ts`)

## 4. Deploy

In the Replit project: **Deploy → Reserved VM**. Choose the smallest tier ("Hacker") for MVP launch; upgrade per the load math in [`docs/decisions/0002-polling-load.md`](../decisions/0002-polling-load.md) if needed.

First deploy takes ~3-5 min (npm install + next build). Subsequent deploys ~1-2 min.

After first successful deploy:

- Set `BETTER_AUTH_URL` to the deployed URL
- Trigger a redeploy to pick up the env change

## 5. Verify

Visit the deployed URL. You should see:

- Brand name + tagline from `src/config/brand.ts`
- "Get started" and "Sign in" buttons (will 404 until W2 lands auth routes — expected pre-W2)

## 6. Handover

When ready to transfer to client: see [`HANDOVER.md`](../../HANDOVER.md) for the secret-rotation checklist and Replit-transfer steps.
