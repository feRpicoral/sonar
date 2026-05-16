import { redirect } from "next/navigation";

import { getPrisma } from "@/lib/db/client";
import { asOrgId, asUserId, type OrgId, type UserId } from "@/lib/db/types";
import { createServerSupabase } from "@/lib/supabase/server";

export type Role = "ADMIN" | "MEMBER";

export interface Session {
  userId: UserId;
  email: string;
  orgId: OrgId;
  role: Role;
}

/**
 * Resolve the current session and active organization. Returns `null` if the
 * user is unauthenticated, has no active org claim, or no longer holds a
 * membership in the claimed org.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const activeOrgId =
    (data.user.app_metadata?.active_org_id as string | undefined) ??
    (data.user.user_metadata?.active_org_id as string | undefined);
  if (!activeOrgId) return null;

  const membership = await getPrisma().membership.findUnique({
    where: { orgId_userId: { orgId: activeOrgId, userId: data.user.id } },
    select: { role: true },
  });
  if (!membership) return null;

  return {
    userId: asUserId(data.user.id),
    email: data.user.email ?? "",
    orgId: asOrgId(activeOrgId),
    role: membership.role,
  };
}

/** Redirects to /login if no session. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Redirects to /login if no session, /dashboard if not an admin. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== "ADMIN") redirect("/dashboard");
  return session;
}
