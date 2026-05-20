"use client";

import { Mail, Pencil, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateLeadEmailAction } from "@/lib/leads/actions";

export function LeadEmailEditor({
  leadId,
  initialEmail,
}: {
  leadId: string;
  initialEmail: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialEmail ?? "");
  const [isPending, startTransition] = useTransition();

  const onSave = () => {
    startTransition(async () => {
      const result = await updateLeadEmailAction(leadId, value);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Email updated");
      setIsEditing(false);
    });
  };

  const onCancel = () => {
    setValue(initialEmail ?? "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="jane@acme.com"
          autoFocus
          className="h-7 max-w-xs text-sm"
          disabled={isPending}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
        />
        <Button size="sm" onClick={onSave} disabled={isPending} className="h-7 px-2.5 text-xs">
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onCancel}
          disabled={isPending}
          className="h-7 w-7"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="group text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
    >
      <Mail className="h-3 w-3" />
      {initialEmail ? <span>{initialEmail}</span> : <span className="italic">Add email</span>}
      <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
