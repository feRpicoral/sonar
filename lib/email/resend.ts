import { Resend } from "resend";

import { requireEnv } from "@/lib/env/server";

let _client: Resend | undefined;

function getClient(): Resend {
  if (_client) return _client;
  _client = new Resend(requireEnv("RESEND_API_KEY"));
  return _client;
}

export function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
}

export interface SendOptions {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  /**
   * Resend caches the response keyed by this value for 24 hours. Pass a stable
   * per-send identifier (e.g. draft id) so a transient client retry doesn't
   * trigger a second delivery if Resend already accepted the first call.
   */
  idempotencyKey?: string;
}

export interface SendResult {
  messageId: string;
}

export async function sendEmail(options: SendOptions): Promise<SendResult> {
  const client = getClient();
  const { data, error } = await client.emails.send(
    {
      from: getFromAddress(),
      to: [options.to],
      subject: options.subject,
      text: options.text,
      replyTo: options.replyTo,
    },
    options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
  );
  if (error) throw new Error(`Resend send failed: ${error.message}`);
  if (!data?.id) throw new Error("Resend returned no message id");
  return { messageId: data.id };
}
