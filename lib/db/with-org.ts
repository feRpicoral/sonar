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
  "delete",
  "deleteMany",
]);

const CREATE_ONE_OPS = new Set(["create"]);
const CREATE_MANY_OPS = new Set(["createMany", "createManyAndReturn"]);

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

          if (READ_OR_MUTATE_OPS.has(op)) {
            a.where = { ...((a.where as object | undefined) ?? {}), orgId };
          } else if (CREATE_ONE_OPS.has(op)) {
            a.data = { ...((a.data as object | undefined) ?? {}), orgId };
          } else if (CREATE_MANY_OPS.has(op)) {
            const data = a.data;
            if (Array.isArray(data)) {
              a.data = data.map((d) => ({ ...(d as object), orgId }));
            } else if (data && typeof data === "object") {
              a.data = { ...(data as object), orgId };
            }
          } else if (op === "upsert") {
            a.where = { ...((a.where as object | undefined) ?? {}), orgId };
            a.create = { ...((a.create as object | undefined) ?? {}), orgId };
          }

          return query(args);
        },
      },
    },
  });
}
