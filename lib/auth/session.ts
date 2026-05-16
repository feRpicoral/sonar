import { redirect } from "next/navigation";

import { getPrisma } from "@/lib/db/client";
import { asOrgId, asUserId, type OrgId, type UserId } from "@/lib/db/types";
import { createAdminSupabase } from "@/lib/supabase/admin";
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

/**
 * Like `requireSession`, but if the user is authenticated without a usable
 * org claim, route them through onboarding instead of bouncing to login.
 *
 * - No auth user → /login
 * - User, no memberships → /create-org
 * - User, memberships but stale/missing active_org_id → repair the claim
 *   to the oldest membership, then return the session.
 */
export async function requireSessionOrOnboard(): Promise<Session> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const memberships = await getPrisma().membership.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { orgId: true, role: true },
  });
  if (memberships.length === 0) redirect("/create-org");

  let activeOrgId =
    (user.app_metadata?.active_org_id as string | undefined) ??
    (user.user_metadata?.active_org_id as string | undefined);
  const isValid = activeOrgId && memberships.some((m) => m.orgId === activeOrgId);

  if (!isValid) {
    activeOrgId = memberships[0]!.orgId;
    const admin = createAdminSupabase();
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, active_org_id: activeOrgId },
    });
  }

  const role = memberships.find((m) => m.orgId === activeOrgId)!.role;

  return {
    userId: asUserId(user.id),
    email: user.email ?? "",
    orgId: asOrgId(activeOrgId!),
    role,
  };
}

/** Redirects to /login if no session. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Requires session AND admin role. Members are redirected to /dashboard. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireSessionOrOnboard();
  if (session.role !== "ADMIN") redirect("/dashboard");
  return session;
}
