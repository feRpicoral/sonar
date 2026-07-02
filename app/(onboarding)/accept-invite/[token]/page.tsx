import Link from "next/link";

import { AcceptInviteButton } from "@/components/onboarding/accept-invite-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getPrisma } from "@/lib/db/client";
import { hashInviteToken } from "@/lib/invites/token";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await getPrisma().invite.findUnique({
    where: { token: hashInviteToken(token) },
    select: {
      id: true,
      acceptedAt: true,
      expiresAt: true,
      role: true,
      organization: { select: { name: true } },
    },
  });

  if (!invite) {
    return (
      <Alert variant="destructive">
        <AlertDescription>This invite link is invalid.</AlertDescription>
      </Alert>
    );
  }
  if (invite.acceptedAt) {
    return (
      <Alert>
        <AlertDescription>
          This invite has already been accepted. Sign in to access {invite.organization.name}.
        </AlertDescription>
      </Alert>
    );
  }
  if (invite.expiresAt < new Date()) {
    return (
      <Alert variant="destructive">
        <AlertDescription>This invite has expired. Ask an admin for a new link.</AlertDescription>
      </Alert>
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            You&apos;re invited to {invite.organization.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in or create an account to accept. Then re-open this invite link.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/signup">Create an account</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Join {invite.organization.name}</h1>
        <p className="text-muted-foreground text-sm">
          You&apos;ve been invited as {invite.role.toLowerCase()}.
        </p>
      </div>
      <AcceptInviteButton token={token} />
    </div>
  );
}
