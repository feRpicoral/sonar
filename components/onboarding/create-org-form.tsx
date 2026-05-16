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
import { createOrgAction } from "@/lib/onboarding/actions";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  slug: z
    .string()
    .min(2, "At least 2 characters")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
});

type FormValues = z.infer<typeof schema>;

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function CreateOrgForm() {
  const [isPending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "" },
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", data.name);
      fd.append("slug", data.slug);
      const result = await createOrgAction({}, fd);
      if (result?.error) toast.error(result.error);
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
              <FormLabel>Organization name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme Inc."
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    if (!form.getValues("slug")) {
                      form.setValue("slug", slugify(e.target.value), { shouldValidate: true });
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL slug</FormLabel>
              <FormControl>
                <Input placeholder="acme" {...field} />
              </FormControl>
              <FormDescription>
                Used in URLs and webhook payloads. Cannot be changed later.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Creating workspace…" : "Create workspace"}
        </Button>
      </form>
    </Form>
  );
}
