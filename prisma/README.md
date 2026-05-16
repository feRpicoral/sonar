# Prisma — Sonar database

## Initial setup

1. Provision a Supabase project. Copy `DATABASE_URL` and `DIRECT_URL` from the project's
   connection settings into `.env.local`.

2. Generate the base schema migration:

   ```bash
   npx prisma migrate dev --name init
   ```

3. Apply the post-init SQL (pgvector, RLS policies, auth-sync trigger):

   ```bash
   psql "$DIRECT_URL" -f prisma/sql/setup.sql
   ```

   Or paste `prisma/sql/setup.sql` into the Supabase SQL editor.

4. Verify with Studio:

   ```bash
   npx prisma studio
   ```

## Day-to-day

- Edit `schema.prisma`, then `npx prisma migrate dev --name <change>`.
- If you change anything in `prisma/sql/setup.sql`, re-apply it (idempotent).
- Production migrations: `npx prisma migrate deploy` against the production URL.

## Tenancy model

Three layers (see `lib/db/with-org.ts` and `lib/db/types.ts`):

1. **Branded TS types** — domain code receives `OrgId`, not `string`.
2. **Prisma `$extends`** — `getDb(orgId)` auto-injects `where.orgId` / `data.orgId` on
   all multi-tenant operations.
3. **Postgres RLS** — `prisma/sql/setup.sql` enables RLS on every tenant table and
   policies queries via `public.is_member_of(org_id)`.

Non-tenant tables (`User`, `Organization`, `Membership`, `ProcessedStripeEvent`) are
queried via the base `getPrisma()` client — middleware does not inject into these.
