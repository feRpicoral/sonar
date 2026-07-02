import { getPrisma } from "./client";
import type { OrgId } from "./types";

// Multi-tenant models - every table that carries `orgId` and must be scoped
// at the app layer. Updates here when new tenant tables are added to schema.prisma.
const MULTI_TENANT_MODELS = new Set([
  "Lead",
  "Call",
  "Interaction",
  "AgentRun",
  "AgentRunStep",
  "EmailDraft",
  "EmailDelivery",
  "LeadEmbedding",
  "Subscription",
  "AuditLog",
  "Webhook",
  "WebhookDelivery",
  "ApiKey",
  "Invite",
]);

const READ_OR_MUTATE_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
]);

const CREATE_ONE_OPS = new Set(["create"]);
const CREATE_MANY_OPS = new Set(["createMany", "createManyAndReturn"]);

/**
 * Mutate `args` in place to scope a single Prisma operation to `orgId`.
 * Fails closed: an operation this function does not recognise throws rather than
 * running unscoped, so a future Prisma op against a tenant model can never
 * silently leak across organizations.
 */
export function scopeArgsToOrg(op: string, args: Record<string, unknown>, orgId: OrgId): void {
  if (READ_OR_MUTATE_OPS.has(op)) {
    args.where = { ...((args.where as object | undefined) ?? {}), orgId };
  } else if (CREATE_ONE_OPS.has(op)) {
    args.data = { ...((args.data as object | undefined) ?? {}), orgId };
  } else if (CREATE_MANY_OPS.has(op)) {
    const data = args.data;
    if (Array.isArray(data)) {
      args.data = data.map((d) => ({ ...(d as object), orgId }));
    } else if (data && typeof data === "object") {
      args.data = { ...(data as object), orgId };
    }
  } else if (op === "upsert") {
    args.where = { ...((args.where as object | undefined) ?? {}), orgId };
    args.create = { ...((args.create as object | undefined) ?? {}), orgId };
  } else {
    throw new Error(
      `getDb: unhandled Prisma operation "${op}" on a multi-tenant model. Add it to the ` +
        `with-org extension so orgId scoping is enforced.`,
    );
  }
}

/**
 * Returns a Prisma client extended to auto-inject `orgId` on every operation
 * against a multi-tenant model. Reads/updates/deletes get `where.orgId = orgId`
 * injected; creates get `data.orgId = orgId` injected; upserts get both.
 *
 * Non-tenant models (User, Organization, Membership, ProcessedStripeEvent) are
 * passed through unmodified - callers should use `getPrisma()` directly.
 */
export function getDb(orgId: OrgId) {
  return getPrisma().$extends({
    name: "with-org",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !MULTI_TENANT_MODELS.has(model)) {
            return query(args);
          }

          // Treat operation as string so we can match against ops not present
          // in Prisma's narrow `$allOperations` union (create / upsert variants).
          // Treat args as a record so we can splice in orgId without fighting
          // operation-specific generics - Prisma validates the final shape.
          const op = operation as string;
          const a = args as Record<string, unknown>;

          scopeArgsToOrg(op, a, orgId);

          return query(args);
        },
      },
    },
  });
}
