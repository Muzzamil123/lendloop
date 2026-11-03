# LendLoop

**Borrow what you need. Lend what you don't.**

LendLoop is a small tool-lending board for neighbours. People list tools, others request them for a date range, owners approve or decline, and n8n handles notifications and overdue reminders.

Stack: **Next.js 16** (App Router), **Clerk** (sign-in), **Convex** (database, server functions, HTTP endpoints, scheduler), **n8n** (automation, self-hosted in Docker).

---

## Contents

1. [Local setup](#1-local-setup)
2. [Environment variables](#2-environment-variables)
3. [Architecture](#3-architecture)
4. [Roles and access rules](#4-roles-and-access-rules)
5. [n8n integration](#5-n8n-integration)
6. [Security and data minimisation](#6-security-and-data-minimisation)
7. [Tests](#7-tests)
8. [Trade-offs](#8-trade-offs)
9. [What I would change for production](#9-what-i-would-change-for-production)

---

## 1. Local setup

### Prerequisites

- Node.js 20+
- Docker with Docker Compose
- Free [Clerk](https://clerk.com) and [Convex](https://convex.dev) accounts

### 1.1 Install

```bash
npm install
cp .env.example .env.local
```

### 1.2 Clerk

1. Create a Clerk application with email sign-in.
2. Copy the publishable key and secret key into `.env.local`.
3. Under **Integrations**, turn on **Convex**. This makes Clerk issue session tokens with `aud: "convex"`.
4. Under **Sessions → Customize session token**, add the claims Convex reads:

   ```json
   {
     "aud": "convex",
     "email": "{{user.primary_email_address}}",
     "name": "{{user.full_name}}"
   }
   ```

   Without `email`, sign-in stops at "Your account needs an email address."

### 1.3 Convex

```bash
npx convex dev
```

The first run logs you in, creates a deployment and writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` to `.env.local`. Leave it running: it pushes function changes as you save.

In a second terminal, set the server-side variables:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev
npx convex env set ADMIN_EMAILS you@example.com
```

### 1.4 Run the app

```bash
npm run dev
```

Open http://localhost:3000 and sign in. Any email in `ADMIN_EMAILS` gets the admin role on sign-in.

### 1.5 n8n

```bash
cp .env.n8n.example .env.n8n
# Fill in three random secrets, e.g. with: openssl rand -hex 32
#   N8N_ENCRYPTION_KEY, LENDLOOP_N8N_WEBHOOK_SECRET, LENDLOOP_CONVEX_HTTP_SECRET
# and LENDLOOP_CONVEX_SITE_URL=https://<deployment>.convex.site

docker compose up -d
```

Give Convex the same two shared secrets (Convex → n8n, and n8n → Convex):

```bash
npx convex env set N8N_WEBHOOK_SECRET  <value of LENDLOOP_N8N_WEBHOOK_SECRET>
npx convex env set CONVEX_HTTP_SECRET  <value of LENDLOOP_CONVEX_HTTP_SECRET>
```

Then open http://localhost:5678, create the local owner account and import the workflows from `n8n/`:

1. `error-handler.json`, then **Publish** it.
2. `request-notification.json` and `overdue-reminders.json`. In each one, open **⋮ → Settings → Error workflow**, pick **LendLoop - Error handler**, and save.
3. **Publish** both.

### 1.6 Let Convex reach n8n

A Convex cloud deployment can't call `localhost`, so the compose file has an optional Cloudflare quick tunnel:

```bash
docker compose --profile tunnel up -d
docker compose logs tunnel | grep trycloudflare.com
npx convex env set N8N_WEBHOOK_URL https://<random>.trycloudflare.com/webhook/lendloop-loan-events
```

The quick-tunnel URL changes on every restart, so set `N8N_WEBHOOK_URL` again after one. To check the path, send an unsigned request: n8n should answer `401`.

> n8n Cloud also works. Import the same JSON files, set the four `LENDLOOP_*` values as n8n variables, and point `N8N_WEBHOOK_URL` at the cloud webhook. No tunnel is needed.

### 1.7 Try the flows

- **Notification:** from a second account, request a tool. A run appears under the workflow's **Executions**, and the loan shows "Notification sent just now".
- **Overdue reminder:** open **LendLoop - Overdue reminders** and click **Execute**. To produce an overdue loan locally, approve a request and move its `endDate` into the past in the Convex dashboard (**Data → loans**). A second run on the same day records nothing new.

---

## 2. Environment variables

| Variable | Set in | Used by | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local` | Next.js | Clerk front end |
| `CLERK_SECRET_KEY` | `.env.local` | Next.js | Clerk server side (route protection in `proxy.ts`) |
| `CONVEX_DEPLOYMENT` | `.env.local` (written by `convex dev`) | Convex CLI | Which deployment to push to |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` (written by `convex dev`) | Next.js | Convex client URL |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex env | `convex/auth.config.ts` | Validates Clerk tokens |
| `ADMIN_EMAILS` | Convex env | `convex/users.ts` | Comma-separated list of admin emails |
| `N8N_WEBHOOK_URL` | Convex env | `convex/automation.ts` | Where loan events are posted |
| `N8N_WEBHOOK_SECRET` | Convex env | `convex/automation.ts` | Signs Convex → n8n requests |
| `CONVEX_HTTP_SECRET` | Convex env | `convex/http.ts` | Verifies n8n → Convex requests |
| `N8N_ENCRYPTION_KEY` | `.env.n8n` | n8n | Encrypts n8n's stored credentials |
| `LENDLOOP_N8N_WEBHOOK_SECRET` | `.env.n8n` | Request notification workflow | Same value as `N8N_WEBHOOK_SECRET` |
| `LENDLOOP_CONVEX_HTTP_SECRET` | `.env.n8n` | Overdue reminders workflow | Same value as `CONVEX_HTTP_SECRET` |
| `LENDLOOP_CONVEX_SITE_URL` | `.env.n8n` | Overdue reminders workflow | `https://<deployment>.convex.site` |

`.env.local` and `.env.n8n` are git-ignored. Only the `*.example` templates, which have no values, are committed.

---

## 3. Architecture

```
 Browser ── Next.js pages + Clerk sign-in
    │  queries / mutations, Clerk token attached
    ▼
 Convex ── data + every permission check
    │
    │ (1) loan requested / approved / declined / returned / cancelled
    │     mutation ─schedules→ action ─signed POST→ n8n webhook ─→ notify (mock log)
    │                            └ retries 30s, 60s, 120s, then records "failed"
    │
    │ (2) daily 08:00 UTC: n8n ─signed GET /overdue-loans→ Convex
    │ (3) per reminder:    n8n ─signed POST /reminder-status (idempotency key)→ Convex
    │
    └── n8n error workflow logs any failed run
```

### Data model (`convex/schema.ts`)

| Table | Fields | Indexes |
|---|---|---|
| `users` | clerkId, name, email, role (`admin` / `user`), trustedLender | `by_clerkId` |
| `tools` | ownerId, name, category, condition, description, createdAt, removedAt? | `by_owner`, `by_category` |
| `loans` | toolId, borrowerId, ownerId, startDate, endDate (`YYYY-MM-DD`), status, createdAt, updatedAt | `by_tool`, `by_borrower`, `by_owner`, `by_status_endDate` |
| `automationEvents` | loanId, type (`request_notified` / `reminder_sent`), status (`ok` / `failed`), idempotencyKey, detail?, createdAt | `by_key`, `by_loan` |

Loan statuses are `pending → approved | declined | cancelled`, and `approved → returned`. Availability is derived rather than stored: a tool is on loan today if an approved loan covers today. Removing a tool is a soft delete (`removedAt`), so past loans still point at a real record.

### Code layout

```
app/                  public page and the five signed-in views
components/           AppShell (nav), views/, shared UI
convex/
  schema.ts
  lib/auth.ts         requireUser / requireAdmin
  lib/access.ts       ownership checks in one place
  lib/hmac.ts         sign + verify (used by both directions)
  lib/dates.ts        UTC calendar-day helpers
  users.ts tools.ts loans.ts
  automation.ts       notification action, retries, idempotent event log
  http.ts             /overdue-loans and /reminder-status
  permissions.test.ts
n8n/                  exported workflows (no secrets)
docker-compose.yml    n8n (+ optional tunnel)
proxy.ts              Clerk route protection for the signed-in pages
```

---

## 4. Roles and access rules

Every rule is enforced in a Convex function. The UI only hides buttons the caller couldn't use anyway.

| Function | Who may call | Rule |
|---|---|---|
| `tools.listPublic` | anyone | Returns only `{ name, category }` for tools not on loan today |
| `tools.list` / `tools.mine` | signed in | Owner shown by first name only |
| `tools.create` | signed in | Owner is always the caller; text is trimmed and length-limited |
| `tools.update` | owner | |
| `tools.remove` | owner or admin | An owner can't remove a tool with a current or upcoming approved loan; open requests are cancelled and their borrowers notified |
| `loans.request` | signed in | Not your own tool; start date today or later and at most 90 days ahead; at most 30 days long; no overlap with an approved loan; no duplicate pending request |
| `loans.approve` / `decline` | tool owner | Only from `pending`; approve rechecks overlap and declines clashing pending requests |
| `loans.cancel` | borrower | Only from `pending` |
| `loans.markReturned` | tool owner | Only from `approved`, once the loan has started |
| `loans.myRequests` / `incoming` | signed in | Filtered to the caller on the server |
| `loans.listAll`, `users.listForAdmin`, `users.setTrustedLender` | admin | |

**Becoming admin.** `users.ensureCurrentUser` runs after sign-in and builds the user row from the verified Clerk token. The role comes from the `ADMIN_EMAILS` Convex env var, never from a client argument. Changing the variable takes effect the next time that user opens the app.

---

## 5. n8n integration

### Signing (both directions)

```
X-LendLoop-Timestamp: <unix seconds>
X-LendLoop-Signature: hex(HMAC-SHA256(secret, `${timestamp}.${rawBody}`))
```

The receiver recomputes the signature over the **raw** body, compares in constant time, and rejects timestamps more than 5 minutes off, which blocks replayed requests. GET requests sign an empty body. Each direction has its own secret, so a leak on one side doesn't let anyone forge calls the other way.

- Convex → n8n: `convex/lib/hmac.ts` signs; the **Verify signature** Code node checks it, and a bad signature gets a 401.
- n8n → Convex: the **Sign request** / **Sign write-back** Code nodes sign; `convex/http.ts` verifies.

### Workflow 1: Request notification

A mutation can't make network calls, so `loans.request` and every status change schedule `automation.sendLoanNotification` (an action) with `ctx.scheduler.runAfter(0, …)`. The action:

1. Skips if `notify:<loanId>:<event>` is already recorded. A loan reaches each status at most once, so this key is unique per real event.
2. Builds the minimal payload (below), signs it and POSTs it to n8n.
3. On success, records `request_notified / ok`.
4. On failure, reschedules itself with backoff (30 s, 60 s, 120 s). After the fourth attempt it records `request_notified / failed` and logs an error, so a failure shows up on the loan instead of disappearing.

n8n flow: **Webhook** (raw body) → **Verify signature** → **Signature valid?** → **Compose message** → **Send notification (mock)** → 200. Otherwise → 401.

### Workflow 2: Overdue reminders

**Schedule (daily 08:00 UTC)** or **Manual trigger** → **Sign request** → **GET /overdue-loans** → **One item per loan** → **Send reminder (mock)** → **Sign write-back** → **POST /reminder-status**.

The write-back carries `reminderKey = reminder:<loanId>:<YYYY-MM-DD>`. Convex looks the key up before inserting, so a retried or repeated run on the same day returns `{ recorded: false, duplicate: true }` and creates nothing. Tomorrow's reminder has a new key. Both HTTP nodes retry three times, 5 seconds apart.

### Failures are visible

- The n8n **Error handler** workflow (Error Trigger → log) is the error workflow for both flows. It logs the workflow name, execution ID, failing node and message.
- Convex notification failures are stored as `failed` events after the last retry, and the loan shows "Notification failed …".
- The latest automation event on each loan appears in the UI as "Reminder sent 2 days ago" or "Notification sent just now".

### Secrets in workflows

Workflows read secrets only through `$env.LENDLOOP_*`. No secret is typed into a node, so the exported JSON files contain none. The compose file allows this with `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, and allows Node's `crypto` module in Code nodes with `NODE_FUNCTION_ALLOW_BUILTIN=crypto`.

---

## 6. Security and data minimisation

- **Server-side authorisation.** Every query and mutation calls `requireUser` or `requireAdmin` and the ownership helpers in `convex/lib/access.ts`. Calling Convex directly gets the same answer as using the UI.
- **Identity from the token, not the client.** User rows, roles and owner IDs come from the verified Clerk identity. No function accepts a user ID or role from the browser for the caller.
- **Public projection.** `tools.listPublic` builds `{ name, category }` on the server. Owner fields never reach a signed-out browser, and a test asserts the exact shape.
- **First names only between users.** Other members see the owner's or borrower's first name, never their email. A user without a name in Clerk shows as "Neighbour", not as part of their email address.
- **Minimal payloads to n8n.** A notification carries the event, loan ID, the recipient's first name and email, the other party's first name, the tool name and the dates. Nothing else.
- **Signed, time-limited calls in both directions**, with separate secrets per direction and constant-time comparison.
- **Input validation.** Convex validators on every argument, plus length limits, enum categories and conditions, calendar-day checks, and loan-length and look-ahead limits.
- **Secrets only in env vars.** None in code, Git or workflow JSON.

---

## 7. Tests

```bash
npm test
```

`convex/permissions.test.ts` runs the real Convex functions against [convex-test](https://docs.convex.dev/testing/convex-test)'s in-memory backend. It covers:

- the public list exposes only name and category; signed-out callers are refused;
- a user can't edit or remove another user's tool; an admin can remove any listing; owners can't borrow their own tools;
- only the tool owner can approve or decline (not the borrower, a stranger or an admin); only the borrower can cancel; no double approval; no overlapping requests;
- admin-only functions refuse regular users; the role comes from `ADMIN_EMAILS`;
- unsigned or wrongly signed HTTP calls get 401; a repeated reminder write-back is stored once.

---

## 8. Trade-offs

- **Users sync on sign-in, not via Clerk webhooks.** Simpler for a demo. Name and email changes in Clerk apply on the next sign-in.
- **Dates are calendar days in UTC.** This avoids time-zone bugs in overlap checks. A real product would store the community's time zone.
- **The notification channel is a logged mock.** The brief allows it. Swapping in an Email, Slack or Discord node changes one n8n node and nothing in Convex.
- **Quick tunnel for local development.** It keeps setup to one command. A deployed n8n needs no tunnel.
- **Admin can't approve or decline on an owner's behalf.** The brief gives admins moderation powers (remove listings, view loans, mark Trusted Lenders), not the right to make lending decisions for someone else.

---

## 9. What I would change for production

- **Identity:** sync users through Clerk webhooks (`user.created` / `updated` / `deleted`) and delete or anonymise data when an account is removed.
- **Secrets:** separate secrets per environment, a rotation process (accept two secrets during the overlap), and a secret manager instead of `.env` files.
- **n8n hosting:** a fixed HTTPS hostname behind auth (no quick tunnel), queue mode with Postgres and Redis, backups of the n8n database, and a pinned n8n image version.
- **Real delivery:** a transactional email provider with templates, unsubscribe links and bounce handling. The error workflow should alert a Slack channel or on-call tool, not only log.
- **Abuse limits:** rate limiting on public queries, borrow requests and the HTTP endpoints.
- **Observability:** Sentry on the front end and in Convex actions, plus a dashboard of `failed` automation events.
- **Audit trail:** a log of admin actions and loan status changes (who, what, when).
- **Data retention:** a policy for old loans and automation events, and a privacy notice describing what is shared with n8n.
- **Quality gates:** CI running type checks, lint and tests on every pull request; end-to-end tests of the main flows; and preview deployments with their own Convex and Clerk instances.
