# Kikapu

**Know where every shilling goes.**

Kikapu is a smart receipt scanner and household expense manager built for Kenyan households. Scan a shopping receipt with your phone, review what it found, and watch your spending dashboard update instantly — no paid AI subscription required.

- **Free, on-device OCR.** Tesseract.js reads receipts entirely in your browser.
- **Deterministic parsing.** Regex and heuristics — not AI guesswork — extract store, items, prices, VAT and totals, with every uncertain field flagged for you to confirm.
- **KES-first.** Kenyan Shillings by default, VAT-aware, aware of M-Pesa reference codes and open-air market shopping with no receipt at all.
- **Private.** Your receipts are yours — no ads, no data resale.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + React Router + Tailwind CSS |
| UI components | Hand-built shadcn-style primitives on Radix UI + Framer Motion |
| Charts | Recharts |
| Backend | Vercel Serverless Functions (plain Node, no framework) |
| Database | Neon Postgres (serverless HTTP driver) via Drizzle ORM |
| File storage | Vercel Blob (optional) |
| OCR | Tesseract.js, lazily loaded, running in-browser |
| Auth | Custom session auth — bcrypt + JWT (jose) + httpOnly cookies, DB-backed revocation |
| Validation | Zod, shared between client and API |
| Testing | Vitest (unit) |
| PWA | vite-plugin-pwa (installable, offline app shell) |

This is deliberately **not** a Next.js app — the frontend is a plain Vite SPA, and the backend is a folder of small Vercel functions under `/api`. Both deploy together from one Vercel project on the free Hobby plan.

---

## Project structure

```
api/              Vercel serverless functions (the backend)
lib/              Server-only code: db client/schema/migrations, auth, http helpers, blob, rate limiting
shared/           Isomorphic code used by BOTH client and server: money math, dates,
                  the receipt parsing engine, category taxonomy, Zod schemas, types
client/           The Vite + React frontend
scripts/          One-off scripts: db:migrate, db:seed
tests/unit/       Vitest unit tests for the highest-risk logic (money, dates, parsing, budgets, duplicates)
tests/fixtures/   Synthetic sample receipt text used by the parser tests
```

---

## Local development

### 1. Prerequisites

- Node.js 20+
- A free [Neon](https://neon.tech) Postgres database
- (Optional) A [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store, for storing receipt photos
- (Optional) A Google Gemini API key, only if you want to enable the optional AI-enhanced scan

### 2. Install dependencies

```bash
npm install
```

This installs both the root (API/server) dependencies and the `client/` workspace in one step (npm workspaces).

### 3. Configure environment variables

```bash
cp .env.example .env
```

Then fill in:

- `DATABASE_URL` — your Neon connection string (see **Deployment** below for how to get one)
- `AUTH_SECRET` — generate with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```
- `BLOB_READ_WRITE_TOKEN` — optional; leave blank to run without receipt-photo storage
- `GEMINI_API_KEY` — optional; leave blank to keep the free OCR scanner as the only option

### 4. Set up the database

```bash
npm run db:generate   # generates SQL migrations from lib/db/schema.ts (already committed under lib/db/migrations)
npm run db:migrate    # applies them to DATABASE_URL
npm run db:seed       # optional: creates a demo account (demo@kikapu.app / Kikapu2026!) with sample receipts
```

### 5. Run it

The API is a set of plain Vercel functions, so local development uses the Vercel CLI to emulate the real serverless runtime:

```bash
npm run dev
```

This runs `vercel dev`, which serves the built client **and** the `/api` functions together on one local URL (it will prompt you to link/create a Vercel project the first time — choose "no" for most setup questions since this is just for local dev).

Alternatively, to iterate on the frontend alone with instant hot-reload (API calls will fail until you also run `vercel dev` separately, or point `vite.config.ts`'s dev proxy at a running `vercel dev` instance on port 3000):

```bash
npm run dev:client
```

### 6. Run tests

```bash
npm test          # Vitest unit tests (money math, date parsing, receipt parsing, budgets, duplicate detection)
npm run typecheck # TypeScript across both the server code and the client
```

---

## Deployment to Vercel (free Hobby plan)

### Step 1 — Push this repo to GitHub

Vercel deploys from a Git repository.

### Step 2 — Create the Neon database

1. On [vercel.com](https://vercel.com), create a new project from your GitHub repo.
2. In the project, go to **Storage → Create Database → Neon (Serverless Postgres)** and follow the prompts. This automatically sets `DATABASE_URL` in your Vercel project's environment variables.
   - Alternatively, create a free project directly at [neon.tech](https://neon.tech) and paste its pooled connection string into Vercel's **Settings → Environment Variables** as `DATABASE_URL`.

### Step 3 — Set the remaining environment variables

In **Settings → Environment Variables**, add:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Set automatically if you used the Neon integration |
| `AUTH_SECRET` | Yes | A long random string — generate as shown above |
| `BLOB_READ_WRITE_TOKEN` | No | From **Storage → Create Database → Blob** |
| `GEMINI_API_KEY` | No | Only if you want to offer the optional AI-enhanced scan |
| `NODE_ENV` | Recommended | Set to `production` |

### Step 4 — Confirm the build settings

Vercel should auto-detect these from `vercel.json`, but to be explicit:

- **Framework preset:** Other
- **Build command:** `npm run build`
- **Output directory:** `client/dist`
- **Install command:** `npm install`

### Step 5 — Apply database migrations

From your machine (with `DATABASE_URL` pointed at the **production** database in your `.env`):

```bash
npm run db:migrate
```

### Step 6 — Deploy

Push to your connected branch, or click **Deploy** in the Vercel dashboard. Vercel will build the client as a static site and deploy every file under `/api` as its own serverless function.

### Free-tier limits worth knowing

- **Vercel Hobby serverless functions** have a request body limit of roughly 4.5 MB — the client compresses receipt photos client-side before upload to stay well under this.
- **Neon's free tier** suspends an idle database after a period of inactivity; the first request after a while may be a little slower while it wakes up.
- **Vercel Blob's free tier** has a storage and bandwidth cap — if you don't configure `BLOB_READ_WRITE_TOKEN` at all, Kikapu still works fully; it just won't keep a copy of the receipt photo alongside the extracted data.
- Vercel, Neon and Blob each enforce their own separate free-tier limits — none of them are configured here to fall back to a paid plan automatically.

---

## How the receipt parser works

`shared/parsing/` is a deterministic, dependency-free text parser — no AI, no network call. It:

1. Normalizes OCR noise (common confusions like `O`↔`0`, `I`/`l`↔`1`, `S`↔`5`), but only within number-shaped tokens, so real words are left alone.
2. Identifies the merchant from the first few lines (with a small lookup table of common Kenyan retailers, falling back to a heuristic guess).
3. Finds a transaction date in several common formats, including noisy OCR'd ones.
4. Walks every line, skipping anything that's metadata (phone/PIN/address) or a receipt-level summary field (subtotal/VAT/total/cash/change/M-Pesa/card), and attempts to read the rest as a product line — including an explicit `2 X 190.00` quantity marker, and ignoring pack-size numbers like "2L" or "500ML" that aren't prices.
5. Detects whether VAT is already included in the item prices (common on Kenyan supermarket receipts) or charged on top, by checking which assumption reconciles against the printed total.
6. Flags — rather than hides — any mismatch between the printed total and the sum of line items, and any item it isn't confident about, so the user always has the final say before saving.
7. Never treats an M-Pesa confirmation code, cash tendered, or change given as a product or an amount.

See `tests/unit/receiptParser.test.ts` and `tests/fixtures/sampleReceipts.ts` for the exact behaviors this is tested against, including a deliberately noisy/faded receipt and one where the printed total is wrong.

---

## Security notes

- Every API route checks that the requested resource belongs to the caller's household before returning or modifying it — there is no endpoint that trusts a client-supplied ID without that check.
- Passwords are hashed with bcrypt; sessions are signed JWTs backed by a revocable database row (so "sign out" actually invalidates the session, not just clears a cookie).
- Receipt images are never served from a public, guessable URL — the browser only ever requests `/api/receipts/:id/image`, which re-checks household ownership before streaming the file.
- The optional AI enhancement is off by default, requires an explicit per-scan consent flag on every request (not just a stored preference), and is never reachable at all unless the deployer sets `GEMINI_API_KEY`.
- Auth, upload and AI endpoints are rate-limited.

---

## Known limitations

Built honestly, not perfectly. In the interest of not overclaiming:

- **Duplicate detection is metadata-based, not an image hash.** It compares merchant, day, total and item count — it's a heuristic warning the user can dismiss, not a hard guarantee, and the spec's "image fingerprint" idea would need real sample receipts to tune properly.
- **Offline sync is best-effort.** A receipt saved while offline is queued in IndexedDB and retried when the browser comes back online, but there's no server-side idempotency key yet — the usual possible-duplicate check is what protects against a retried sync being saved twice, not a hard transactional guarantee.
- **Vercel Blob has no private-ACL tier today.** "Private" receipt images means: an unguessable storage path, and the browser is only ever given the authenticated `/api/receipts/:id/image` proxy route — never the underlying Blob URL. It is not a signed-URL system with expiry.
- **No Playwright end-to-end suite yet.** Given the scope of this build, automated testing focused on Vitest unit tests for the highest-risk deterministic logic (money math, date/receipt parsing, budget math, duplicate detection) rather than a full browser-driven E2E suite. The core user journey (register → onboard → scan → review → save → dashboard) has been exercised manually, not under an automated E2E harness, and there is no live Postgres database in this build environment to run integration tests against.
- **Product name matching is exact, not fuzzy-merged.** Per the spec's own instruction not to auto-merge uncertain matches, "COOKING OIL" and "CKG OIL" are currently tracked as separate products rather than offered as a suggested alias to confirm — that suggestion UI is a good next feature.
- **The optional AI endpoint is implemented but untested against a live Gemini API key** (none was available while building this) — it's been written defensively (strict response validation, clear fallback messaging), but hasn't been exercised against the real service.
- **No push notifications.** Budget alerts are in-app only, as the spec asked not to promise anything unimplemented.

## Suggested next steps

1. Run the app against a real Neon database and a handful of real (anonymized) Kenyan receipts to tune the parser's regexes further.
2. Add a Playwright E2E suite covering the full scan → review → save → dashboard loop.
3. Add a "suggest alias" flow for product name normalization (per spec section 12.E).
4. Add perceptual image hashing for stronger duplicate detection if receipt photos are being kept.
5. Multi-member households: the schema already supports multiple `household_members` per household; the UI for inviting a second member doesn't exist yet.

---

## License

See [LICENSE](./LICENSE).
