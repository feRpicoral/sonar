import type {
  AgentRunStatus,
  AgentRunStepStatus,
  EmailDeliveryStatus,
  EmailDraftStatus,
  LeadStatus,
  SubscriptionStatus,
  WebhookDeliveryStatus,
} from "@prisma/client";
import {
  Ban,
  Check,
  Clock,
  Eye,
  Loader2,
  Minus,
  MousePointerClick,
  Pencil,
  Send,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";

import type { StageKey, StatusDescriptor } from "@/components/ui/status-pill";

export const runStatusMeta: Record<AgentRunStatus, StatusDescriptor> = {
  PENDING: { label: "Queued", variant: "zinc", icon: Clock },
  RUNNING: { label: "Running", variant: "violet", icon: Loader2, spin: true },
  AWAITING_APPROVAL: { label: "Awaiting approval", variant: "amber", icon: Eye },
  COMPLETED: { label: "Completed", variant: "emerald", icon: Check },
  FAILED: { label: "Failed", variant: "rose", icon: X },
  CANCELLED: { label: "Cancelled", variant: "zinc", icon: Ban },
};

export const stepStatusMeta: Record<AgentRunStepStatus, StatusDescriptor> = {
  PENDING: { label: "Pending", variant: "zinc", icon: Clock },
  RUNNING: { label: "Running", variant: "violet", icon: Loader2, spin: true },
  COMPLETED: { label: "Completed", variant: "emerald", icon: Check },
  FAILED: { label: "Failed", variant: "rose", icon: X },
  SKIPPED: { label: "Skipped", variant: "dashed", icon: Minus },
};

export const emailDraftStatusMeta: Record<EmailDraftStatus, StatusDescriptor> = {
  DRAFT: { label: "Draft", variant: "zinc", icon: Pencil },
  APPROVED: { label: "Approved", variant: "violet", icon: Check },
  SENT: { label: "Sent", variant: "emerald", icon: Send },
  FAILED: { label: "Failed", variant: "rose", icon: X },
};

export const emailDeliveryStatusMeta: Record<EmailDeliveryStatus, StatusDescriptor> = {
  PENDING: { label: "Pending", variant: "zinc", icon: Clock },
  SENT: { label: "Sent", variant: "violet", icon: Send },
  DELIVERED: { label: "Delivered", variant: "emerald", icon: Check },
  OPENED: { label: "Opened", variant: "emerald", icon: Eye },
  CLICKED: { label: "Clicked", variant: "emerald", icon: MousePointerClick },
  BOUNCED: { label: "Bounced", variant: "rose", icon: TriangleAlert },
  COMPLAINED: { label: "Complained", variant: "amber", icon: TriangleAlert },
};

export const webhookDeliveryStatusMeta: Record<WebhookDeliveryStatus, StatusDescriptor> = {
  PENDING: { label: "Pending", variant: "zinc", icon: Clock },
  DELIVERED: { label: "Delivered", variant: "emerald", icon: Check },
  FAILED: { label: "Failed", variant: "rose", icon: X },
  DEAD_LETTER: { label: "Dead letter", variant: "rose", icon: Ban, strong: true },
};

export const subscriptionStatusMeta: Record<SubscriptionStatus, StatusDescriptor> = {
  ACTIVE: { label: "Active", variant: "emerald", icon: Check },
  TRIALING: { label: "Trialing", variant: "violet", icon: Zap },
  PAST_DUE: { label: "Past due", variant: "amber", icon: TriangleAlert },
  INCOMPLETE: { label: "Incomplete", variant: "amber", icon: Clock },
  INCOMPLETE_EXPIRED: { label: "Incomplete expired", variant: "zinc", icon: Ban },
  UNPAID: { label: "Unpaid", variant: "rose", icon: TriangleAlert },
  CANCELED: { label: "Canceled", variant: "zinc", icon: Ban },
};

export const leadStageMeta: Record<LeadStatus, { label: string; stage: StageKey }> = {
  DISCOVERY: { label: "Discovery", stage: "discovery" },
  QUALIFIED: { label: "Qualified", stage: "qualified" },
  DEMO: { label: "Demo", stage: "demo" },
  PROPOSAL: { label: "Proposal", stage: "proposal" },
  CLOSED: { label: "Closed", stage: "closed" },
};

export const LEAD_STAGE_ORDER: LeadStatus[] = [
  "DISCOVERY",
  "QUALIFIED",
  "DEMO",
  "PROPOSAL",
  "CLOSED",
];
