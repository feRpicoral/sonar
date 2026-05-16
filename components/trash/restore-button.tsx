"use client";

import { RotateCcw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { restoreLeadAction } from "@/lib/leads/restore";

export function RestoreLeadButton({ leadId, name }: { leadId: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const result = await restoreLeadAction(leadId);
      if (result.error) toast.error(result.error);
      else toast.success(`Restored ${name}`);
    });
  };

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={onClick} disabled={isPending}>
      <RotateCcw className="h-3.5 w-3.5" />
      {isPending ? "Restoring…" : "Restore"}
    </Button>
  );
}
