-- Sonar: revoke Data API (anon/authenticated) access to tenant data.
--
-- The browser ships the Supabase anon key (lib/supabase/client.ts) and uses it
-- only for Auth and Storage uploads (lib/calls/upload-call-file.ts). No
-- application code reads or writes tenant tables through PostgREST or Realtime -
-- all tenant access goes through the server-side Prisma connection, which
-- connects as the table owner and bypasses RLS.
--
-- Supabase's default public-schema grants give anon and authenticated ALL
-- privileges on every table, leaving the FOR ALL tenant_isolation RLS policy as
-- the only gate. Because that policy's USING clause doubles as WITH CHECK, any
-- authenticated member could write directly to their org's rows - flip their
-- subscription to PRO, forge api_keys rows, tamper with audit_logs, or read
-- webhook secrets and invite tokens. Revoke those grants so RLS is no longer the
-- sole control. RLS stays enabled as defense in depth.

-- No tenant table (or the org/membership/user tables) should be writable through
-- the Data API.
DO $$
DECLARE
  t text;
  writable_locked text[] := ARRAY[
    'leads', 'calls', 'interactions',
    'agent_runs', 'agent_run_steps',
    'email_drafts', 'email_deliveries',
    'lead_embeddings', 'subscriptions',
    'audit_logs',
    'webhooks', 'webhook_deliveries',
    'api_keys', 'invites',
    'organizations', 'memberships', 'users'
  ];
BEGIN
  FOREACH t IN ARRAY writable_locked LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- Sensitive tables also must not be readable through the Data API: secrets,
-- key hashes, billing state, and the audit trail.
DO $$
DECLARE
  t text;
  read_locked text[] := ARRAY[
    'api_keys', 'webhooks', 'subscriptions',
    'audit_logs', 'invites', 'email_deliveries'
  ];
BEGIN
  FOREACH t IN ARRAY read_locked LOOP
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- processed_stripe_events was never covered by RLS at all. Close it entirely:
-- it backs Stripe webhook idempotency and has no business being reachable by any
-- browser role.
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON public.processed_stripe_events FROM anon, authenticated;
