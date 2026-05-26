"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { writeAudit } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";
import { asMembershipId, asOrgId, asUserId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

// ─── Create invite (admin only) ────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export type CreateInviteResult = { error?: string; url?: string };

export async function createInviteAction(formData: FormData): Promise<CreateInviteResult> {
  const session = await requireAdmin();

  const parsed = inviteSchema.safeParse({
    email: formData.get("email") || undefined,
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const db = getDb(session.orgId);
  const invite = await db.invite.create({
    data: {
      // orgId is auto-injected by the with-org middleware; we pass it here too
      // to satisfy the Prisma type signature.
      orgId: session.orgId,
      token,
      email: parsed.data.email ?? null,
      role: parsed.data.role,
      expiresAt,
      createdByUserId: session.userId,
    },
  });

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "member.invited",
    targetType: "invite",
    targetId: invite.id,
    metadata: { role: parsed.data.role, email: parsed.data.email ?? null },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  revalidatePath("/settings/members");
  return { url: `${base}/accept-invite/${token}` };
}

// ─── Accept invite (authenticated user) ────────────────────────────────────

export async function acceptInviteAction(token: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const prisma = getPrisma();
  const invite = await prisma.invite.findUnique({
    where: { token },
    select: { id: true, orgId: true, role: true, email: true, acceptedAt: true, expiresAt: true },
  });
  if (!invite) return { error: "Invalid invite" };
  if (invite.acceptedAt) return { error: "Invite already accepted" };
  if (invite.expiresAt < new Date()) return { error: "Invite expired" };

  // Targeted invites are bound to the recipient's email - anyone else with the
  // link can't accept it. Open invites (email == null) stay shareable.
  if (invite.email) {
    const userEmail = (user.email ?? "").trim().toLowerCase();
    if (userEmail !== invite.email.trim().toLowerCase()) {
      return { error: "This invite is for a different email address" };
    }
  }

  await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email ?? "",
      name: (user.user_metadata?.full_name as string | undefined) ?? null,
      avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    },
    update: {},
  });

  // Atomic accept: only the caller that flips acceptedAt from null wins. A
  // concurrent acceptance sees count = 0 and bails before creating membership.
  const result = await prisma.$transaction(async (tx) => {
    const claim = await tx.invite.updateMany({
      where: { id: invite.id, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (claim.count === 0) return { ok: false as const, reason: "race" as const };

    const existingMembership = await tx.membership.findUnique({
      where: { orgId_userId: { orgId: invite.orgId, userId: user.id } },
      select: { id: true },
    });
    if (existingMembership) return { ok: false as const, reason: "already_member" as const };

    await tx.membership.create({
      data: { orgId: invite.orgId, userId: user.id, role: invite.role },
    });
    return { ok: true as const };
  });

  if (!result.ok) {
    return {
      error:
        result.reason === "already_member"
          ? "You are already a member of this workspace"
          : "Invite already accepted",
    };
  }

  const admin = createAdminSupabase();
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, active_org_id: invite.orgId },
  });

  await writeAudit({
    orgId: asOrgId(invite.orgId),
    actorUserId: asUserId(user.id),
    action: "member.joined",
    targetType: "membership",
    metadata: { role: invite.role, inviteId: invite.id },
  });

  redirect("/dashboard");
}

// ─── Member admin: change role / remove ────────────────────────────────────

export async function changeMemberRoleAction(
  membershipId: string,
  newRole: "ADMIN" | "MEMBER",
): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const prisma = getPrisma();

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { orgId: true, userId: true, role: true },
  });
  if (!membership || membership.orgId !== session.orgId) {
    return { error: "Membership not found" };
  }
  if (membership.role === newRole) return {};

  // Admin invariants: workspace control can never be locked out.
  // - Admins can't demote themselves (forces another admin to do it).
  // - The last admin can't be demoted, period.
  if (membership.role === "ADMIN" && newRole === "MEMBER") {
    if (membership.userId === session.userId) {
      return { error: "You cannot change your own admin role - ask another admin" };
    }
    const adminCount = await prisma.membership.count({
      where: { orgId: session.orgId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      return { error: "Workspace must have at least one admin" };
    }
  }

  await prisma.membership.update({
    where: { id: membershipId },
    data: { role: newRole },
  });

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "member.role_changed",
    targetType: "membership",
    targetId: asMembershipId(membershipId),
    metadata: { previousRole: membership.role, newRole, targetUserId: membership.userId },
  });

  revalidatePath("/settings/members");
  return {};
}

export async function removeMemberAction(membershipId: string): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const prisma = getPrisma();

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { orgId: true, userId: true, role: true },
  });
  if (!membership || membership.orgId !== session.orgId) {
    return { error: "Membership not found" };
  }
  if (membership.userId === session.userId) {
    return { error: "You cannot remove yourself" };
  }
  if (membership.role === "ADMIN") {
    const adminCount = await prisma.membership.count({
      where: { orgId: session.orgId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      return { error: "Workspace must have at least one admin" };
    }
  }

  await prisma.membership.delete({ where: { id: membershipId } });

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "member.removed",
    targetType: "membership",
    targetId: asMembershipId(membershipId),
    metadata: { removedUserId: membership.userId, role: membership.role },
  });

  revalidatePath("/settings/members");
  return {};
}
