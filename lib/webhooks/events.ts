// Event catalog kept in its own file so client components can import the
// constant without pulling server-only modules (pg / Prisma adapter) along.

export const WEBHOOK_EVENTS = [
  "lead.created",
  "lead.updated",
  "run.completed",
  "email.approved",
  "email.sent",
  "email.delivered",
  "email.bounced",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];
