import "server-only";

import { NextResponse } from "next/server";

import { getPrisma } from "@/lib/db/client";
import { asOrgId, type OrgId } from "@/lib/db/types";

import { type ApiKeyScope, hashApiKey } from "./crypto";

export interface ApiAuthResult {
  orgId: OrgId;
  scopes: ApiKeyScope[];
  apiKeyId: string;
}

export type ApiVerifyResult =
  | { ok: true; auth: ApiAuthResult }
  | { ok: false; response: NextResponse };

/**
 * Authenticate a public API request via `Authorization: Bearer <key>`.
 * Checks the scope, rejects revoked keys, and (fire-and-forget) records
 * `last_used_at` for the keys-settings UI.
 */
export async function verifyApiKey(
  req: Request,
  requiredScope: ApiKeyScope,
): Promise<ApiVerifyResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Missing bearer token" }, { status: 401 }),
    };
  }
  const plaintext = authHeader.slice("Bearer ".length).trim();
  if (!plaintext) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Empty bearer token" }, { status: 401 }),
    };
  }

  const hash = hashApiKey(plaintext);
  const prisma = getPrisma();
  const apiKey = await prisma.apiKey.findUnique({
    where: { hash },
    select: { id: true, orgId: true, scopes: true, revokedAt: true },
  });

  if (!apiKey) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid API key" }, { status: 401 }),
    };
  }
  if (apiKey.revokedAt) {
    return {
      ok: false,
      response: NextResponse.json({ error: "API key revoked" }, { status: 401 }),
    };
  }
  if (!apiKey.scopes.includes(requiredScope)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Missing required scope: ${requiredScope}` },
        { status: 403 },
      ),
    };
  }

  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    ok: true,
    auth: {
      orgId: asOrgId(apiKey.orgId),
      scopes: apiKey.scopes as ApiKeyScope[],
      apiKeyId: apiKey.id,
    },
  };
}
