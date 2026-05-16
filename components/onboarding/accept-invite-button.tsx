"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/lib/invites/actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      className="w-full"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await acceptInviteAction(token);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      {isPending ? "Joining…" : "Accept invite"}
    </Button>
  );
}
