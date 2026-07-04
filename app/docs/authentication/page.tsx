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
import { getApiBaseUrl } from "@/lib/env/app-url";

export default function AuthenticationDocsPage() {
  const base = getApiBaseUrl();
  return (
    <article>
      <H1>Authentication</H1>
      <Lead>
        Sonar API uses bearer tokens. Generate a key per integration with the minimum scope required
        - keys are workspace-scoped and never cross orgs.
      </Lead>

      <H2>Generating a key</H2>
      <P>
        Go to <InlineCode>Settings / API keys</InlineCode> and click <strong>Create API key</strong>
        . Pick a descriptive name and only the scopes you need. The plaintext key is shown once -
        copy it immediately. If you lose it, revoke and re-issue.
      </P>

      <Callout variant="warning">
        Store keys like passwords. Never commit to source control. Rotate quarterly and on suspicion
        of leak.
      </Callout>

      <H2>Sending requests</H2>
      <P>
        Pass the key in the <InlineCode>Authorization</InlineCode> header:
      </P>
      <CodeBlock language="bash">{`curl -H "Authorization: Bearer sk_<your-key>" \\
  ${base}/leads`}</CodeBlock>

      <H2>Scopes</H2>
      <Table>
        <thead>
          <tr>
            <Th>Scope</Th>
            <Th>Grants</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td>
              <InlineCode>leads:read</InlineCode>
            </Td>
            <Td>List leads.</Td>
          </tr>
          <tr>
            <Td>
              <InlineCode>leads:write</InlineCode>
            </Td>
            <Td>Create leads. Does not grant read.</Td>
          </tr>
          <tr>
            <Td>
              <InlineCode>runs:read</InlineCode>
            </Td>
            <Td>Read agent run state and step outputs.</Td>
          </tr>
          <tr>
            <Td>
              <InlineCode>runs:write</InlineCode>
            </Td>
            <Td>
              Start agent runs. The runner uses the workspace&apos;s admin context for attribution.
            </Td>
          </tr>
        </tbody>
      </Table>

      <H2>Errors</H2>
      <H3>401 Unauthorized</H3>
      <P>Missing, malformed, revoked, or unknown bearer token.</P>
      <H3>403 Forbidden</H3>
      <P>Valid key but missing the required scope for this endpoint.</P>

      <H2>Audit trail</H2>
      <P>
        Every API key use is timestamped (<InlineCode>last_used_at</InlineCode> visible in the
        settings UI). Mutating calls (POST) write an audit-log entry with{" "}
        <InlineCode>source: api</InlineCode> and the calling key&apos;s id.
      </P>
    </article>
  );
}
