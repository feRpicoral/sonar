"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";
import { createAdminSupabase } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  avatarUrl: z.union([z.string().url("Invalid URL"), z.literal("")]).optional(),
});

export type UpdateProfileResult = { error?: string; ok?: true };

export async function updateProfileAction(formData: FormData): Promise<UpdateProfileResult> {
  const session = await requireSessionOrOnboard();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    avatarUrl: formData.get("avatarUrl") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const avatarUrl = parsed.data.avatarUrl || null;

  await getPrisma().user.update({
    where: { id: session.userId },
    data: { name: parsed.data.name, avatarUrl },
  });

  const admin = createAdminSupabase();
  await admin.auth.admin.updateUserById(session.userId, {
    user_metadata: { full_name: parsed.data.name, avatar_url: avatarUrl },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
