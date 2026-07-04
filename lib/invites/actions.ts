"use server";

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

import { generateInviteToken, hashInviteToken } from "./token";

// Thrown inside the accept transaction when a concurrent acceptance wins the
// membership.create. Throwing rolls the tx back (so acceptedAt stays null);
// caught right outside the $transaction and turned into the already_member
// result so the caller gets a friendly message.
class AlreadyMemberError extends Error {}

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

  const rawToken = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const db = getDb(session.orgId);
  const invite = await db.invite.create({
    data: {
      // orgId is auto-injected by the with-org middleware; we pass it here too
      // to satisfy the Prisma type signature.
      orgId: session.orgId,
      token: hashInviteToken(rawToken),
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
  return { url: `${base}/accept-invite/${rawToken}` };
}

export async function acceptInviteAction(token: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const prisma = getPrisma();
  const invite = await prisma.invite.findUnique({
    where: { token: hashInviteToken(token) },
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

  // Atomic accept: check existing membership BEFORE flipping acceptedAt, so an
  // already-member visiting an open invite link doesn't burn it. The
  // updateMany then serves as the concurrency claim - whichever caller flips
  // null -> now wins, others see count = 0 and bail. The P2002 catch covers
  // the tight race where a concurrent acceptance creates the membership
  // between our findUnique and our membership.create.
  const result: { ok: true } | { ok: false; reason: "race" | "already_member" } = await prisma
    .$transaction(async (tx) => {
      const existingMembership = await tx.membership.findUnique({
        where: { orgId_userId: { orgId: invite.orgId, userId: user.id } },
        select: { id: true },
      });
      if (existingMembership) {
        return { ok: false as const, reason: "already_member" as const };
      }

      const claim = await tx.invite.updateMany({
        where: { id: invite.id, acceptedAt: null },
        data: { acceptedAt: new Date() },
      });
      if (claim.count === 0) return { ok: false as const, reason: "race" as const };

      try {
        await tx.membership.create({
          data: { orgId: invite.orgId, userId: user.id, role: invite.role },
        });
      } catch (err) {
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: unknown }).code === "P2002"
        ) {
          // Concurrent acceptance won the membership.create; throw so the
          // transaction rolls back (including the acceptedAt update) and the
          // user gets the already_member message.
          throw new AlreadyMemberError();
        }
        throw err;
      }
      return { ok: true as const };
    })
    .catch((err: unknown) => {
      if (err instanceof AlreadyMemberError) {
        return { ok: false as const, reason: "already_member" as const };
      }
      throw err;
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

type AdminMutationResult =
  | { ok: false; error: string }
  | { ok: true; previousRole: "ADMIN" | "MEMBER"; targetUserId: string };

export async function changeMemberRoleAction(
  membershipId: string,
  newRole: "ADMIN" | "MEMBER",
): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const prisma = getPrisma();

  const result: AdminMutationResult = await prisma.$transaction(async (tx) => {
    // Row-lock every admin in this org so two concurrent demote/remove calls
    // can't both pass the "at least one admin remains" check. Postgres
    // re-evaluates FOR UPDATE after the holder commits, so the count below
    // sees the post-commit state.
    await tx.$queryRaw`
      SELECT id FROM memberships
      WHERE org_id = ${session.orgId}::uuid AND role = 'ADMIN'
      FOR UPDATE
    `;

    const membership = await tx.membership.findUnique({
      where: { id: membershipId },
      select: { orgId: true, userId: true, role: true },
    });
    if (!membership || membership.orgId !== session.orgId) {
      return { ok: false, error: "Membership not found" };
    }
    if (membership.role === newRole) {
      return { ok: true, previousRole: membership.role, targetUserId: membership.userId };
    }

    if (membership.role === "ADMIN" && newRole === "MEMBER") {
      if (membership.userId === session.userId) {
        return { ok: false, error: "You cannot change your own admin role - ask another admin" };
      }
      const adminCount = await tx.membership.count({
        where: { orgId: session.orgId, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return { ok: false, error: "Workspace must have at least one admin" };
      }
    }

    await tx.membership.update({
      where: { id: membershipId },
      data: { role: newRole },
    });
    return { ok: true, previousRole: membership.role, targetUserId: membership.userId };
  });

  if (!result.ok) return { error: result.error };
  if (result.previousRole === newRole) {
    revalidatePath("/settings/members");
    return {};
  }

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "member.role_changed",
    targetType: "membership",
    targetId: asMembershipId(membershipId),
    metadata: { previousRole: result.previousRole, newRole, targetUserId: result.targetUserId },
  });

  revalidatePath("/settings/members");
  return {};
}

export async function removeMemberAction(membershipId: string): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const prisma = getPrisma();

  const result: AdminMutationResult = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id FROM memberships
      WHERE org_id = ${session.orgId}::uuid AND role = 'ADMIN'
      FOR UPDATE
    `;

    const membership = await tx.membership.findUnique({
      where: { id: membershipId },
      select: { orgId: true, userId: true, role: true },
    });
    if (!membership || membership.orgId !== session.orgId) {
      return { ok: false, error: "Membership not found" };
    }
    if (membership.userId === session.userId) {
      return { ok: false, error: "You cannot remove yourself" };
    }
    if (membership.role === "ADMIN") {
      const adminCount = await tx.membership.count({
        where: { orgId: session.orgId, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return { ok: false, error: "Workspace must have at least one admin" };
      }
    }

    await tx.membership.delete({ where: { id: membershipId } });
    return { ok: true, previousRole: membership.role, targetUserId: membership.userId };
  });

  if (!result.ok) return { error: result.error };

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "member.removed",
    targetType: "membership",
    targetId: asMembershipId(membershipId),
    metadata: { removedUserId: result.targetUserId, role: result.previousRole },
  });

  revalidatePath("/settings/members");
  return {};
}

export async function revokeInviteAction(inviteId: string): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const db = getDb(session.orgId);

  const deleted = await db.invite.deleteMany({
    where: { id: inviteId, acceptedAt: null },
  });
  if (deleted.count === 0) return { error: "Invite not found or already accepted" };

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "member.invite_revoked",
    targetType: "invite",
    targetId: inviteId,
    metadata: {},
  });

  revalidatePath("/settings/members");
  return {};
}
