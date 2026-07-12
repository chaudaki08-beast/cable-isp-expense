# SB CashFlow

A clean, mobile-first **income & expense tracker** — a Progressive Web App you
can install on your phone. Sign in, then track money across three simple tabs:
**Dashboard · Income · Expenses**.

- Running balance with opening/closing carry-over
- Category breakdown, day-grouped transactions, search
- Period filter (this month / 3m / 6m / year / all) with month stepping
- Add/edit/delete via a bottom sheet · light & dark themes · ₹/$/€… currency
- Installable PWA, works offline (app shell)

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Supabase
(Postgres + Auth) · Tailwind v4.

---

## Run locally

```bash
npm install
cp .env.local.example .env.local   # then fill in your Supabase keys
npm run dev                        # http://localhost:3001
```

### Environment variables

Create `.env.local` (never commit it) with values from your Supabase project
**Settings → API Keys**:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (e.g. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / `publishable` key (public, safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` / `secret` key (**server only**) |

### Database

In the Supabase **SQL Editor**, run [`supabase/setup.sql`](supabase/setup.sql)
once (schema + triggers + row-level security + seed categories). Create your
login under **Authentication → Users**, then in SQL:

```sql
update public.profiles set role = 'owner' where email = 'you@example.com';
```

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Add the three environment variables above in **Settings → Environment
   Variables** (all environments).
4. **Deploy.** Vercel builds and hosts it; Supabase remains the backend.

The data model lives in `income`, `expenses`, and `categories` tables; the app
merges income + expenses into one list (see `src/lib/finance.ts` for the pure
balance/period math and `src/hooks/use-transactions.ts` for the data pipeline).
