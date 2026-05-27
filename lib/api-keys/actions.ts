"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeAudit } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/session";
import { asApiKeyId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

import { generateApiKey, hashApiKey, isValidScope, VALID_SCOPES } from "./crypto";

const createSchema = z.object({
  name: z.string().min(1, "Name required").max(60),
  scopes: z.array(z.string()).min(1, "Select at least one scope"),
});

export type CreateApiKeyResult =
  | { error: string }
  | { plaintext: string; last4: string; name: string };

export async function createApiKeyAction(input: {
  name: string;
  scopes: string[];
}): Promise<CreateApiKeyResult> {
  const session = await requireAdmin();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const invalidScopes = parsed.data.scopes.filter((s) => !isValidScope(s));
  if (invalidScopes.length > 0) {
    return { error: `Unknown scopes: ${invalidScopes.join(", ")}` };
  }
  const scopes = VALID_SCOPES.filter((scope) => parsed.data.scopes.includes(scope));

  const { plaintext, last4 } = generateApiKey();
  const hash = hashApiKey(plaintext);

  const db = getDb(session.orgId);
  const apiKey = await db.apiKey.create({
    data: {
      orgId: session.orgId,
      name: parsed.data.name.trim(),
      hash,
      last4,
      scopes,
      createdByUserId: session.userId,
    },
    select: { id: true },
  });

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "api_key.created",
    targetType: "api_key",
    targetId: asApiKeyId(apiKey.id),
    metadata: { name: parsed.data.name, scopes, last4 },
  });

  revalidatePath("/settings/api-keys");
  return { plaintext, last4, name: parsed.data.name };
}

export async function revokeApiKeyAction(apiKeyId: string): Promise<{ error?: string; ok?: true }> {
  const session = await requireAdmin();
  const db = getDb(session.orgId);

  const key = await db.apiKey.findUnique({
    where: { id: apiKeyId },
    select: { id: true, revokedAt: true, name: true },
  });
  if (!key) return { error: "API key not found" };
  if (key.revokedAt) return { error: "Already revoked" };

  await db.apiKey.update({
    where: { id: apiKeyId },
    data: { revokedAt: new Date() },
  });

  await writeAudit({
    orgId: session.orgId,
    actorUserId: session.userId,
    action: "api_key.revoked",
    targetType: "api_key",
    targetId: asApiKeyId(apiKeyId),
    metadata: { name: key.name },
  });

  revalidatePath("/settings/api-keys");
  return { ok: true };
}
