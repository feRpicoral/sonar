# Sonar

**AI sales enablement workspace.** Multi-agent orchestration for sales teams — upload a call, get research, analysis, strategy, and a follow-up email in seconds.

> Status: in development. See [AGENTS.md](./AGENTS.md) for project rules; full implementation plan is referenced there.

## What this is

Sonar is a B2B sales enablement SaaS where teams share an AI-assisted pipeline. A rep uploads a call recording; in ~20 seconds the app returns:

1. **Research** on the lead's company (Tavily + Claude Haiku 4.5)
2. **Structured analysis** — topics, pain points, objections, action items, sentiment (Claude Sonnet 4.6)
3. **Recommended strategy** — next step, talking points, urgency (Claude Sonnet 4.6)
4. **Follow-up email** draft with citations linking each claim back to a transcript timestamp (Claude Sonnet 4.6, streaming)

The user reviews, edits with feedback, and sends. Resend handles delivery; the team sees status (sent / delivered / opened) in real time.

## Three pillars

1. **Multi-agent orchestration with state** — LangGraph.js, four agents, human-in-the-loop interrupt, Postgres checkpointer, Zod-validated structured outputs per node.
2. **Production audio processing** — Groq Whisper Large v3 with VAD pre-trim, segment timestamps, clickable citations linking email phrases to transcript moments.
3. **Multi-tenant B2B architecture** — Three layers of tenant isolation (branded TypeScript types + Prisma `$extends` middleware + Postgres RLS), workspace switcher, per-org Stripe billing, audit log, outbound webhooks (HMAC + retry), scoped API keys, public docs.

## Stack

Next.js 16 · TypeScript · Tailwind v4 · shadcn/ui · LangGraph.js · Claude (Sonnet 4.6 + Haiku 4.5) · Groq Whisper · Tavily · Supabase (Auth + Postgres with pgvector + Storage + Realtime) · Prisma · Stripe · Resend · Upstash Redis · Inngest · Sentry · LangSmith · PostHog · Vitest · Playwright

## Metrics

To be published with methodology after Phase 10 lands.

## Links

- Live demo — TBD (Vercel)
- Docs — TBD (`/docs`)
- Loom — TBD
- Project rules — [AGENTS.md](./AGENTS.md)

## Local development

```bash
cp .env.example .env.local
# fill in keys — see .env.example
npm install
npm run dev
```

## License

UNLICENSED — portfolio project.
