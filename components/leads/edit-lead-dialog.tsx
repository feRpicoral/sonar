"use client";

import { Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLeadAction, updateLeadEmailAction } from "@/lib/leads/actions";

export interface EditLeadDialogProps {
  lead: {
    id: string;
    name: string;
    companyName: string | null;
    companyWebsite: string | null;
    email: string | null;
  };
}

export function EditLeadDialog({ lead }: EditLeadDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(lead.name);
  const [companyName, setCompanyName] = useState(lead.companyName ?? "");
  const [companyWebsite, setCompanyWebsite] = useState(lead.companyWebsite ?? "");
  const [email, setEmail] = useState(lead.email ?? "");

  const onSave = () => {
    startTransition(async () => {
      const result = await updateLeadAction(lead.id, { name, companyName, companyWebsite });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if ((email.trim() || null) !== (lead.email ?? null)) {
        const emailResult = await updateLeadEmailAction(lead.id, email);
        if (emailResult.error) {
          toast.error(emailResult.error);
          return;
        }
      }
      toast.success("Lead updated");
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit lead</DialogTitle>
          <DialogDescription>Update the contact and company details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field id="name" label="Contact name" value={name} onChange={setName} />
          <Field id="company" label="Company" value={companyName} onChange={setCompanyName} />
          <Field
            id="website"
            label="Website"
            placeholder="https://acme.com"
            value={companyWebsite}
            onChange={setCompanyWebsite}
          />
          <Field
            id="email"
            label="Email"
            type="email"
            placeholder="jane@acme.com"
            value={email}
            onChange={setEmail}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
