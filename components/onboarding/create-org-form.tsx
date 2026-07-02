"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { checkSlugAvailableAction, createOrgAction } from "@/lib/onboarding/actions";

type SlugStatus = "idle" | "checking" | "available" | "taken";

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
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "" },
  });

  const slug = useWatch({ control: form.control, name: "slug" });
  const lastChecked = useRef("");
  const slugManuallyEdited = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!slug || slug.length < 2) {
        setSlugStatus("idle");
        return;
      }
      lastChecked.current = slug;
      setSlugStatus("checking");
      checkSlugAvailableAction(slug)
        .then((r) => {
          if (lastChecked.current !== slug) return;
          setSlugStatus(r.valid && r.available ? "available" : "taken");
        })
        .catch(() => {
          if (lastChecked.current !== slug) return;
          setSlugStatus("idle");
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [slug]);

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
                    // Keep the slug in sync with the name until the user edits
                    // the slug themselves, rather than only on the first keystroke.
                    if (!slugManuallyEdited.current) {
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
                <div className="relative">
                  <Input
                    placeholder="acme"
                    {...field}
                    onChange={(e) => {
                      slugManuallyEdited.current = true;
                      field.onChange(e);
                    }}
                  />
                  {slugStatus !== "idle" && (
                    <span className="absolute top-1/2 right-3 -translate-y-1/2">
                      {slugStatus === "checking" && (
                        <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
                      )}
                      {slugStatus === "available" && <Check className="text-emerald-fg size-3.5" />}
                      {slugStatus === "taken" && <X className="text-rose-fg size-3.5" />}
                    </span>
                  )}
                </div>
              </FormControl>
              {slugStatus === "available" ? (
                <p className="text-emerald-fg text-xs">{slug} is available</p>
              ) : slugStatus === "taken" ? (
                <p className="text-rose-fg text-xs">{slug} is taken</p>
              ) : (
                <FormDescription>
                  Used in URLs and webhook payloads. Cannot be changed later.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending || slugStatus === "taken"}>
          {isPending ? "Creating workspace…" : "Create workspace"}
        </Button>
      </form>
    </Form>
  );
}
