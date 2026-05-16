import { Resend } from "resend";

let _client: Resend | undefined;

function getClient(): Resend {
  if (_client) return _client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set. See .env.example.");
  _client = new Resend(apiKey);
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
}

export interface SendResult {
  messageId: string;
}

export async function sendEmail(options: SendOptions): Promise<SendResult> {
  const client = getClient();
  const { data, error } = await client.emails.send({
    from: getFromAddress(),
    to: [options.to],
    subject: options.subject,
    text: options.text,
    replyTo: options.replyTo,
  });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
  if (!data?.id) throw new Error("Resend returned no message id");
  return { messageId: data.id };
}
