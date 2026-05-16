"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateProfileAction } from "@/lib/auth/profile-actions";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  avatarUrl: z.union([z.string().url("Invalid URL"), z.literal("")]).optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProfileForm({
  initialName,
  initialAvatarUrl,
  email,
}: {
  initialName: string;
  initialAvatarUrl: string;
  email: string;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initialName, avatarUrl: initialAvatarUrl },
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", data.name);
      if (data.avatarUrl) fd.append("avatarUrl", data.avatarUrl);
      const result = await updateProfileAction(fd);
      if (result.error) toast.error(result.error);
      else toast.success("Profile updated");
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="avatarUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar URL (optional)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://..." {...field} value={field.value ?? ""} />
              </FormControl>
              <FormDescription>
                Public image URL. Upload to your own host (e.g. GitHub avatar) and paste the link.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <Input value={email} disabled readOnly className="text-muted-foreground" />
          <p className="text-muted-foreground text-xs">
            Email cannot be changed from here. Use Supabase Auth flows for email migration.
          </p>
        </div>
        <Button type="submit" disabled={isPending || !form.formState.isDirty}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Form>
  );
}
