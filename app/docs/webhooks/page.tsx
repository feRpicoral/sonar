import {
  Callout,
  CodeBlock,
  H1,
  H2,
  H3,
  InlineCode,
  Lead,
  P,
  Table,
  Td,
  Th,
} from "@/components/docs/doc-elements";

export default function WebhooksDocsPage() {
  return (
    <article>
      <H1>Webhooks</H1>
      <Lead>
        Sonar POSTs HMAC-signed JSON to your endpoint when subscribed events fire. Subscribe in{" "}
        <InlineCode>Settings → Webhooks</InlineCode>.
      </Lead>

      <H2>Event catalog</H2>
      <Table>
        <thead>
          <tr>
            <Th>Event</Th>
            <Th>When it fires</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td>
              <InlineCode>lead.created</InlineCode>
            </Td>
            <Td>A new lead row is created (UI or API).</Td>
          </tr>
          <tr>
            <Td>
              <InlineCode>lead.updated</InlineCode>
            </Td>
            <Td>A lead&apos;s status or assignment changes.</Td>
          </tr>
          <tr>
            <Td>
              <InlineCode>run.completed</InlineCode>
            </Td>
            <Td>An agent run reaches AWAITING_APPROVAL with an email draft ready.</Td>
          </tr>
          <tr>
            <Td>
              <InlineCode>email.approved</InlineCode>
            </Td>
            <Td>An email draft is marked approved (before send).</Td>
          </tr>
          <tr>
            <Td>
              <InlineCode>email.sent</InlineCode>
            </Td>
            <Td>Resend has accepted the email for delivery.</Td>
          </tr>
          <tr>
            <Td>
              <InlineCode>email.delivered</InlineCode> / <InlineCode>email.bounced</InlineCode>
            </Td>
            <Td>Resend delivery webhook reports the final state.</Td>
          </tr>
        </tbody>
      </Table>

      <H2>Payload shape</H2>
      <CodeBlock language="json">{`{
  "id": "evt_8a3f...",
  "type": "lead.created",
  "orgId": "...",
  "deliveredAt": "2026-05-15T14:23:00.000Z",
  "data": {
    "leadId": "8c5a...",
    "name": "Jane Doe",
    "status": "DISCOVERY"
  }
}`}</CodeBlock>

      <H2>Signature verification</H2>
      <P>Every request carries:</P>
      <CodeBlock>X-Sonar-Signature: t=&lt;unix&gt;,v1=&lt;hmac_sha256_hex&gt;</CodeBlock>
      <P>
        The signed string is <InlineCode>{"`${timestamp}.${rawBody}`"}</InlineCode>. Reject if{" "}
        <InlineCode>t</InlineCode> is older than 5 minutes (replay protection) or the HMAC
        mismatches.
      </P>

      <H3>Node.js</H3>
      <CodeBlock language="javascript">{`import { createHmac, timingSafeEqual } from "node:crypto";

function verifySonarSignature(rawBody, header, secret) {
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("="))
  );
  const t = Number(parts.t);
  if (Math.abs(Math.floor(Date.now() / 1000) - t) > 300) return false;
  const expected = createHmac("sha256", secret)
    .update(\`\${t}.\${rawBody}\`)
    .digest("hex");
  return timingSafeEqual(
    Buffer.from(parts.v1, "hex"),
    Buffer.from(expected, "hex")
  );
}`}</CodeBlock>

      <H3>Python</H3>
      <CodeBlock language="python">{`import hmac, hashlib, time

def verify_sonar_signature(raw_body: bytes, header: str, secret: str) -> bool:
    parts = dict(p.split("=") for p in header.split(","))
    t = int(parts["t"])
    if abs(int(time.time()) - t) > 300:
        return False
    expected = hmac.new(
        secret.encode(),
        f"{t}.".encode() + raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(parts["v1"], expected)`}</CodeBlock>

      <H2>Delivery + retries</H2>
      <P>
        Failed deliveries (HTTP not 2xx or timeout greater than 10s) are logged with{" "}
        <InlineCode>status: FAILED</InlineCode> in the workspace UI and can be{" "}
        <strong>replayed</strong> manually. Automatic retry with exponential backoff ships in the
        next release.
      </P>

      <Callout>
        Build for idempotency on your side: use <InlineCode>event.id</InlineCode> as a dedupe key.
        Sonar may re-deliver an event if you click replay.
      </Callout>
    </article>
  );
}
