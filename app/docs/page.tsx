import { CodeBlock, H1, H2, H3, InlineCode, Lead, P } from "@/components/docs/doc-elements";
import { getApiBaseUrl } from "@/lib/env/app-url";

export default function DocsOverviewPage() {
  const base = getApiBaseUrl();
  return (
    <article>
      <H1>Sonar API</H1>
      <Lead>
        Programmatic access to your sales pipeline - leads and agent runs. REST over HTTPS, JSON in
        / JSON out, scoped API keys.
      </Lead>

      <H2>Base URL</H2>
      <CodeBlock>{base}</CodeBlock>

      <H2>Quickstart</H2>
      <P>Generate an API key in Settings / API keys, then:</P>
      <CodeBlock language="bash">{`curl -H "Authorization: Bearer sk_..." \\
  ${base}/leads`}</CodeBlock>

      <H2>Conventions</H2>
      <H3>Responses</H3>
      <P>
        Successful responses return <InlineCode>{`{ "data": ... }`}</InlineCode>. Errors return{" "}
        <InlineCode>{`{ "error": "..." }`}</InlineCode> with an appropriate HTTP status (400 invalid
        input, 401 missing/invalid auth, 402 plan limit reached, 403 wrong scope, 404 not found).
      </P>

      <H3>Idempotency</H3>
      <P>
        POST endpoints create new resources every call - there&apos;s no idempotency-key header yet.
        Re-running the same payload will create duplicate rows.
      </P>

      <H3>Rate limiting</H3>
      <P>
        The Free-plan monthly agent-run cap <em>is</em> enforced -{" "}
        <InlineCode>POST /api/v1/runs</InlineCode> returns <InlineCode>402</InlineCode> once it is
        hit. General per-request throttling is not yet enforced and is tracked as deferred work (see{" "}
        <InlineCode>.env.example</InlineCode>). The API may add{" "}
        <InlineCode>RateLimit-Remaining</InlineCode> and <InlineCode>Retry-After</InlineCode>{" "}
        headers in a later release - until then, treat the API as best-effort and back off on{" "}
        <InlineCode>5xx</InlineCode>.
      </P>
    </article>
  );
}
