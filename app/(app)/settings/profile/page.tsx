import { notFound } from "next/navigation";

import { ProfileForm } from "@/components/settings/profile-form";
import { requireSessionOrOnboard } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";

export default async function ProfilePage() {
  const session = await requireSessionOrOnboard();

  const user = await getPrisma().user.findUnique({
    where: { id: session.userId },
    select: { name: true, avatarUrl: true, email: true },
  });
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Profile</h2>
        <p className="text-muted-foreground text-sm">
          Your name and avatar are visible to teammates in this workspace.
        </p>
      </div>
      <ProfileForm
        initialName={user.name ?? ""}
        initialAvatarUrl={user.avatarUrl ?? ""}
        email={user.email}
      />
    </div>
  );
}
