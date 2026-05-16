"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPrisma } from "@/lib/db/client";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export async function switchOrgAction(orgId: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getPrisma().membership.findUnique({
    where: { orgId_userId: { orgId, userId: user.id } },
    select: { id: true },
  });
  if (!membership) return { error: "Not a member of this organization" };

  const admin = createAdminSupabase();
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, active_org_id: orgId },
  });

  revalidatePath("/", "layout");
  return {};
}
