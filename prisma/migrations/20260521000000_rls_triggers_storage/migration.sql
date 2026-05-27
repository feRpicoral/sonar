-- Sonar: tenancy plumbing that lives outside the Prisma schema.
--
-- Idempotent on purpose so applying it on top of a database that previously
-- had `prisma/sql/setup.sql` pasted by hand is a no-op. Every block uses
-- CREATE OR REPLACE / IF NOT EXISTS / ON CONFLICT.

-- ─────────────────────────────────────────────────────────────
-- public.users <-> auth.users sync trigger
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_changed ON auth.users;
CREATE TRIGGER on_auth_user_changed
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security - defense in depth
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_member_of(target_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid() AND org_id = target_org
  );
$$;

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'leads', 'calls', 'interactions',
    'agent_runs', 'agent_run_steps',
    'email_drafts', 'email_deliveries',
    'lead_embeddings', 'subscriptions',
    'audit_logs',
    'webhooks', 'webhook_deliveries',
    'api_keys', 'invites'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I FOR ALL USING (public.is_member_of(org_id))',
      t
    );
  END LOOP;
END $$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_visibility ON public.organizations;
CREATE POLICY org_visibility ON public.organizations
  FOR SELECT
  USING (public.is_member_of(id));

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS membership_visibility ON public.memberships;
CREATE POLICY membership_visibility ON public.memberships
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_member_of(org_id));

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_visibility ON public.users;
CREATE POLICY user_visibility ON public.users
  FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT m.user_id FROM public.memberships m
      WHERE public.is_member_of(m.org_id)
    )
  );

-- ─────────────────────────────────────────────────────────────
-- pgvector composite-index pattern
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS lead_embeddings_org_idx
  ON public.lead_embeddings (org_id);

CREATE INDEX IF NOT EXISTS lead_embeddings_hnsw
  ON public.lead_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- ─────────────────────────────────────────────────────────────
-- Storage bucket for call audio
--
-- Private bucket; app generates signed URLs via the service role.
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'call-audio',
  'call-audio',
  false,
  104857600, -- 100 MB
  ARRAY[
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/x-wav',
    'audio/webm', 'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/m4a'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
