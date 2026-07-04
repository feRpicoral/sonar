<!-- BEGIN:nextjs-agent-rules -->

# Next.js 16 - read before coding

This project runs on **Next.js 16**, which has breaking changes from many agents' training data. APIs, conventions, and file structure may differ. Read the relevant guides in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Sonar - project rules

## What this is

A B2B sales enablement SaaS. A sequential agent pipeline processes sales call recordings to generate research, analysis, strategy, and follow-up emails. Multi-tenant workspace model with per-org billing.

## Architecture pillars

1. **Multi-agent with state** - Sequential nodes (research, transcription, analysis, strategy, writer) return structured Zod outputs, never free text. The runner persists each `AgentRunStep` row so the run resumes from `AWAITING_APPROVAL` after the writer. Background execution is Next.js 16's `after()`; Supabase Realtime is the UI transport. (Inngest + LangGraph migration is a deferred follow-up - see `.env.example`.)
2. **Audio with citations** - Groq Whisper Large v3. Segments + timestamps. Writer node outputs both prose and structured citations that link to transcript moments. (VAD pre-trim before send is a deferred optimization, not yet implemented.)
3. **Multi-tenant** - Three layers: branded `OrgId` TypeScript types + Prisma `$extends` middleware + Postgres RLS. Every business table has `orgId` indexed.

## Code rules

- TypeScript strict including `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. No `any` without an inline comment justifying it.
- Branded ID types from `@/lib/db/types` (`OrgId`, `UserId`, `LeadId`, `RunId`, …). Never pass raw strings.
- All multi-tenant DB access goes through `getDb(orgId)` from `@/lib/db/with-org`. Do not use the base Prisma client in app code.
- Server-only by default. Mark client components with `"use client"`. Server Actions for mutations where it makes sense.
- LLM outputs validated by Zod before persisting. No free-text agent outputs.
- Audit-loggable mutations call `auditLog.write(...)` in the same transaction.
- Conventional Commits 1.0.0. Header line only - no body, no footer, no co-author trailers.
- No comments that restate code. Comment business rules, edge cases, non-obvious constraints only.
- Empty / loading / error states on every list view. Skeletons match content shape.

## Stack reference

- **UI**: Tailwind v4 + shadcn/ui (zinc base + violet accent), Geist Sans/Mono, Lucide icons, Sonner, next-themes.
- **Motion**: `motion` package (formerly framer-motion). Sparse - agent cards + writer cursor + toasts only.
- **ORM**: Prisma + `getDb(orgId)` extension.
- **Auth**: Supabase Auth with `active_org_id` JWT claim.
- **DB**: Supabase Postgres with pgvector. RLS enabled on all multi-tenant tables.
- **AI**: Anthropic SDK with prompt caching. Sonnet 4.6 for analysis / strategy / writer. Haiku 4.5 for research summarization.
- **Audio**: Groq Whisper Large v3. (VAD pre-trim before send is deferred, not yet implemented.)
- **Background**: Next.js 16 `after()` for agent runs (route `maxDuration = 60` on Hobby). Inngest for retries / crons is a deferred follow-up.
- **Realtime**: Supabase Realtime channel per agent run.
- **Streaming**: deferred. The writer node returns a single structured Anthropic tool call today; token-level streaming (Vercel AI SDK) is a planned follow-up.
- **Billing**: Stripe test mode, idempotent webhook handling via `processed_stripe_events`.
- **Email**: Resend, delivery-status webhook with signature verify.
- **Rate limit**: deferred. Per-org limits with Upstash Redis are stubbed in `.env.example` but not enforced yet.

## Design language

- **Typography** - Geist Sans for UI, Geist Mono for transcripts / timestamps / code / API key prefixes.
- **Accent** - violet-600 used sparingly: primary buttons, active states, agent "running" pulses, focus rings.
- **Status colors** - emerald (success), amber (in-progress), rose (failed).
- **Density** - 16px base. Generous whitespace. Hairline 1px borders. No shadows except popovers / modals.
- **Motion** - stagger 60ms slide-up on agent step cards. Defaults elsewhere.
- **Dark mode** - first-class via `next-themes`, system default.
- **References** - Linear (information density), Resend (typography), Vercel dashboard (tables), Attio (B2B CRM aesthetic).

## Folder map

```
app/                        # Next.js App Router (marketing, auth, app, api, docs)
components/                 # shared components (incl. components/ui from shadcn)
lib/                        # domain logic by area: agents, db, auth, billing, email, …
prisma/                     # schema + migrations + seed
.github/workflows/          # CI
```
