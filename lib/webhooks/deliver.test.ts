import { afterEach, describe, expect, it, vi } from "vitest";

import type { OrgId } from "@/lib/db/types";

const updateMock = vi.fn();
const createMock = vi.fn().mockResolvedValue({ id: "delivery-1" });

vi.mock("@/lib/db/with-org", () => ({
  getDb: () => ({
    webhookDelivery: {
      create: createMock,
      update: updateMock,
    },
  }),
}));

vi.mock("./safe-url", () => ({
  assertSafeWebhookUrl: vi.fn().mockResolvedValue(undefined),
  UnsafeWebhookUrlError: class extends Error {},
}));

import { deliverWebhook } from "./deliver";

const baseInput = {
  orgId: "org-1" as OrgId,
  webhookId: "wh-1",
  url: "https://hooks.example.com/endpoint",
  secret: "shhh",
  eventType: "lead.created",
  payload: { leadId: "lead-1" },
};

afterEach(() => {
  vi.restoreAllMocks();
  updateMock.mockReset();
  createMock.mockClear().mockResolvedValue({ id: "delivery-1" });
});

describe("deliverWebhook redirect handling", () => {
  it("does not follow redirects and records the delivery as failed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data/" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await deliverWebhook(baseInput);

    expect(result.delivered).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      baseInput.url,
      expect.objectContaining({ redirect: "manual" }),
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
    const failureData = updateMock.mock.calls[0]![0].data;
    expect(failureData.responseBody).toContain("169.254.169.254");
  });

  it("marks a 2xx response as delivered", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await deliverWebhook(baseInput);

    expect(result.delivered).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "DELIVERED" }) }),
    );
  });
});
