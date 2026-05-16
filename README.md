# Sonar

**AI sales enablement workspace.** Upload a sales call, get research, analysis, strategy, and a follow-up email in seconds — with citations linking every claim back to the transcript.

> Portfolio project. Combines three rarely-co-located skills: multi-agent orchestration with state, production audio processing, and multi-tenant B2B architecture.

[Live demo](https://sonar.vercel.app) · [API docs](https://sonar.vercel.app/docs) · [Loom walkthrough](#) (todo)

---

## What it does

A sales rep uploads a call recording. In ~20 seconds the app returns:

1. **Research** on the prospect's company (Tavily + Claude Haiku 4.5)
2. **Structured analysis** — topics, pain points, objections, action items, sentiment (Claude Sonnet 4.6)
3. **Recommended strategy** — next step + talking points + urgency (Claude Sonnet 4.6)
4. **Follow-up email** with citations linking phrases back to specific transcript segments (Claude Sonnet 4.6)

The user reviews in a split view (email left, transcript right). Hover a citation to highlight its source segment. Approve → Resend sends. Or click **regenerate with feedback**, which re-runs only the writer node and keeps research / analysis / strategy frozen.

## Three pillars

### 1 — Multi-agent orchestration with state

- 4 sequential nodes: research → transcription → analysis → strategy → writer
- Every node returns **structured output via Anthropic tool-use + Zod validation** — never free text
- Run state is persisted to `AgentRunStep` rows; the run pauses at `AWAITING_APPROVAL` after the writer step
- Anthropic **prompt caching** on system messages (`cache_control: ephemeral`) cuts input tokens by ~70% on repeat runs
- Writer step can be **regenerated with reviewer feedback** without re-running research / analysis / strategy
- Background execution via Next.js 16's `after()` route handler (Vercel `maxDuration = 300`)

### 2 — Production audio processing

- Drag-drop upload to Supabase Storage with signed URLs (browser → bucket direct; no proxy)
- **Groq Whisper Large v3** transcription with segment-level timestamps
- Audio file types enforced at both server and bucket level (`audio/mpeg, mp4, wav, webm, ogg, flac`, 100MB cap)
- Writer node receives transcript segments with bracketed indices; citations reference those indices for verification
- Split-view UI scrolls the cited segment into view on hover

### 3 — Multi-tenant B2B

**Three layers of tenant isolation:**

| Layer                                        | Mechanism                                           | File                                           |
| -------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| Branded TS types at call sites               | `OrgId`, `UserId`, `LeadId`, `RunId`, ...           | [`lib/db/types.ts`](lib/db/types.ts)           |
| Prisma `$extends` middleware injects `orgId` | `getDb(orgId)` returns a tenant-scoped client       | [`lib/db/with-org.ts`](lib/db/with-org.ts)     |
| Postgres RLS as defense in depth             | `is_member_of(org_id)` policy on every tenant table | [`prisma/sql/setup.sql`](prisma/sql/setup.sql) |

Plus full B2B plumbing:

- **Workspace switcher** + invite-by-link onboarding
- **Stripe billing** (Checkout + Customer Portal embed, idempotent webhook handler via `processed_stripe_events`)
- **Outbound webhooks** with HMAC-SHA256 signing + timestamp replay window + delivery log + manual replay
- **Scoped API keys** (5 scopes, last-used tracking, revocable) protecting `/api/v1/*` endpoints
- **Audit log** writing on every mutating action — filterable by category in the UI
- **Soft delete + restore** with `/trash` page
- **Member offboarding** ready (membership delete; sessions/keys cascade in follow-up)

## Stack

Next.js 16 · TypeScript strict · Tailwind v4 · shadcn/ui · Prisma 7 (adapter pattern) · Supabase (Auth + Postgres pgvector + Storage) · Claude Sonnet 4.6 + Haiku 4.5 · Groq Whisper · Tavily · Stripe · Resend · Sentry · PostHog · Vitest · Geist Sans/Mono · violet-600 accent

## Honest metrics

To be measured against the live deployment with real services. Current targets the architecture is built for:

- Agent run end-to-end on a 5-minute call: **15-25 s** (with prompt caching)
- Time-to-first-output (research step): **<1.5 s p50**
- Transcription: **~10 s per 30 min of audio** (Groq Whisper Large v3)
- Cross-tenant access probes: **100% blocked** at the branded-types layer; verified at the Prisma layer; verified again at the RLS layer

## Architecture

```
┌──────────────┐    ┌─────────────────┐    ┌────────────────┐
│ Next.js 16   │───▶│ Server Action / │───▶│ Postgres       │
│ App Router   │    │ Route Handler   │    │ (Supabase)     │
│ + Geist UI   │    │                 │    │                │
└──────┬───────┘    └────────┬────────┘    └────────────────┘
       │                     │                       ▲
       │                     │ after()               │ Prisma 7
       │                     ▼                       │ + $extends
       │            ┌─────────────────┐              │ (orgId inject)
       │            │ Agent runner    │──────────────┘
       │            │                 │
       │            │  research ─►    │  Tavily + Claude Haiku 4.5
       │            │  analysis ─►    │  Claude Sonnet 4.6 (tools)
       │            │  strategy ─►    │  Claude Sonnet 4.6 (tools)
       │            │  writer   ─►    │  Claude Sonnet 4.6 (tools)
       │            └────────┬────────┘
       │                     │
       │                     ▼
       │            ┌─────────────────┐
       │            │ EmailDraft +    │  Resend (send)
       │            │ AWAITING_APPROVAL │  Stripe (billing)
       │            │                 │  Webhooks (HMAC)
       │            └─────────────────┘
       │
       └─── /api/v1/* ──────▶ scoped API key + audit
```

## Local development

```bash
cp .env.example .env.local
# Fill in: Supabase (URL, anon, service role), Anthropic, Groq, Tavily,
# Stripe (test), Resend, optionally Sentry / PostHog / LangSmith.

npm install
npx prisma migrate dev --name init
psql "$DIRECT_URL" -f prisma/sql/setup.sql
npm run prisma db seed
npm run dev
```

Useful scripts:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint flat config
npm run test        # Vitest (unit tests for tenant types, HMAC, schemas, ...)
npm run build       # Production build
```

## Project layout

```
app/
  (marketing)/      home page                       [app/page.tsx]
  (auth)/           login, signup, oauth callback
  (onboarding)/     create-org, accept-invite
  (app)/            authenticated shell (sidebar + workspace switcher)
    leads/          kanban + lead detail + call detail + agent run
    runs/[id]/      ★ agent run viewer (live polling)
    emails/[id]/    ★ approval split view with citations
    settings/       members, billing, api-keys, webhooks, audit-log
    trash/          soft-deleted recovery
  api/
    v1/             public REST API (scoped via API keys)
    webhooks/       stripe (idempotent), resend
    runs/start/     authenticated UI entrypoint to runAgent
  docs/             /docs site (overview, auth, api ref, webhooks)
lib/
  agents/           graph definition, prompts, 4 nodes, runner, state
  db/               types (branded), client (lazy adapter), with-org
  auth/             session, sign-in/out actions, org switching
  audit/            writeAudit
  api-keys/         crypto, verify middleware, actions
  webhooks/         HMAC, publish + deliver + replay, events catalog
  email/            Resend wrapper + actions (approve, edit, regenerate)
  storage/          Supabase Storage helpers (signed URLs)
  billing/          Stripe wrapper + checkout / portal actions
  observability/    PostHog provider
prisma/
  schema.prisma     full data model (18 models)
  sql/setup.sql     pgvector + auth trigger + RLS policies + storage bucket
  seed.ts           demo workspace with 10 leads + sample call
```

## CI

GitHub Actions runs on every PR + push to main:

```
typecheck (tsc --noEmit)
  → lint (ESLint flat)
    → test (Vitest)
      → build (next build)
```

## License

UNLICENSED — portfolio project.
