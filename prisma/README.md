# Prisma - Sonar database

## Initial setup

1. Provision a Supabase project. Copy `DATABASE_URL` and `DIRECT_URL` from the project's
   connection settings into `.env.local`.

2. Apply all migrations (schema + RLS + auth trigger + storage bucket):

   ```bash
   npx prisma migrate deploy
   ```

3. Verify with Studio:

   ```bash
   npx prisma studio
   ```

## Day-to-day

- Edit `schema.prisma`, then `npx prisma migrate dev --name <change>`.
- Production migrations: `npx prisma migrate deploy` against the production direct URL.

## Tenancy model

Three layers (see `lib/db/with-org.ts` and `lib/db/types.ts`):

1. **Branded TS types** - domain code receives `OrgId`, not `string`.
2. **Prisma `$extends`** - `getDb(orgId)` auto-injects `where.orgId` / `data.orgId` on
   all multi-tenant operations.
3. **Postgres RLS** - the `20260521000000_rls_triggers_storage` migration enables RLS
   on every tenant table and policies queries via `public.is_member_of(org_id)`.

Non-tenant tables (`User`, `Organization`, `Membership`, `ProcessedStripeEvent`) are
queried via the base `getPrisma()` client - middleware does not inject into these.
