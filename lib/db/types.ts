// Branded ID types - nominal typing on top of string to prevent ID mix-ups
// at call sites. Constructors should only run at trusted boundaries
// (post-auth session validation, post-API-key verification, post-Zod-parse).

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type OrgId = Brand<string, "OrgId">;
export type UserId = Brand<string, "UserId">;
export type LeadId = Brand<string, "LeadId">;
export type CallId = Brand<string, "CallId">;
export type RunId = Brand<string, "RunId">;
export type StepId = Brand<string, "StepId">;
export type EmailDraftId = Brand<string, "EmailDraftId">;
export type MembershipId = Brand<string, "MembershipId">;
export type InviteId = Brand<string, "InviteId">;
export type ApiKeyId = Brand<string, "ApiKeyId">;
export type WebhookId = Brand<string, "WebhookId">;

export const asOrgId = (id: string): OrgId => id as OrgId;
export const asUserId = (id: string): UserId => id as UserId;
export const asLeadId = (id: string): LeadId => id as LeadId;
export const asCallId = (id: string): CallId => id as CallId;
export const asRunId = (id: string): RunId => id as RunId;
export const asStepId = (id: string): StepId => id as StepId;
export const asEmailDraftId = (id: string): EmailDraftId => id as EmailDraftId;
export const asMembershipId = (id: string): MembershipId => id as MembershipId;
export const asInviteId = (id: string): InviteId => id as InviteId;
export const asApiKeyId = (id: string): ApiKeyId => id as ApiKeyId;
export const asWebhookId = (id: string): WebhookId => id as WebhookId;
