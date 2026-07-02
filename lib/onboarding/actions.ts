"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { writeAudit } from "@/lib/audit/log";
import { getPrisma } from "@/lib/db/client";
import { asOrgId, asUserId } from "@/lib/db/types";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
});

export async function checkSlugAvailableAction(
  slug: string,
): Promise<{ available: boolean; valid: boolean }> {
  // Require a signed-in user: without this, the action is an unauthenticated
  // endpoint that lets anyone enumerate which org slugs exist.
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { available: false, valid: false };

  const parsed = schema.shape.slug.safeParse(slug);
  if (!parsed.success) return { available: false, valid: false };

  const existing = await getPrisma().organization.findUnique({
    where: { slug: parsed.data },
    select: { id: true },
  });
  return { available: existing === null, valid: true };
}

export type CreateOrgResult = { error?: string };

export async function createOrgAction(
  _prev: CreateOrgResult,
  formData: FormData,
): Promise<CreateOrgResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = schema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const prisma = getPrisma();

  // Backfill the Supabase user mirror for local/dev gaps.
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

  const existingSlug = await prisma.organization.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (existingSlug) {
    return { error: "This slug is already taken" };
  }

  const org = await prisma.$transaction(async (tx) => {
    const o = await tx.organization.create({
      data: { name: parsed.data.name, slug: parsed.data.slug },
    });
    await tx.membership.create({
      data: { orgId: o.id, userId: user.id, role: "ADMIN" },
    });
    return o;
  });

  const admin = createAdminSupabase();
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, active_org_id: org.id },
  });

  await writeAudit({
    orgId: asOrgId(org.id),
    actorUserId: asUserId(user.id),
    action: "org.created",
    targetType: "organization",
    targetId: org.id,
    metadata: { name: org.name, slug: org.slug },
  });

  redirect("/dashboard");
}
