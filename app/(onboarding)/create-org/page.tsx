import { redirect } from "next/navigation";

import { CreateOrgForm } from "@/components/onboarding/create-org-form";
import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function CreateOrgPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const existing = await getPrisma().membership.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });
  if (existing) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="text-muted-foreground text-sm">
          A workspace holds your leads, calls, and team. You can invite teammates next.
        </p>
      </div>
      <CreateOrgForm />
    </div>
  );
}
