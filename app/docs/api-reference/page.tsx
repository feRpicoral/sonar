import { CodeBlock, H1, H2, H3, InlineCode, Lead, P } from "@/components/docs/doc-elements";

export default function ApiReferenceDocsPage() {
  return (
    <article>
      <H1>API reference</H1>
      <Lead>
        All endpoints under <InlineCode>/api/v1</InlineCode>.
      </Lead>

      <H2>Leads</H2>

      <H3>GET /api/v1/leads</H3>
      <P>
        List leads. Returns up to <InlineCode>limit</InlineCode> rows (max 100, default 50).
      </P>
      <CodeBlock language="bash">{`curl -H "Authorization: Bearer $SONAR_KEY" \\
  https://sonar.vercel.app/api/v1/leads?limit=20`}</CodeBlock>
      <CodeBlock language="json">{`{
  "data": [
    {
      "id": "8c5a...",
      "name": "Jane Doe",
      "companyName": "Acme Inc",
      "companyWebsite": "https://acme.com",
      "status": "DISCOVERY",
      "assignedToUserId": "...",
      "createdAt": "2026-05-15T14:23:00.000Z",
      "updatedAt": "2026-05-15T14:23:00.000Z"
    }
  ]
}`}</CodeBlock>
      <P>
        Required scope: <InlineCode>leads:read</InlineCode>.
      </P>

      <H3>POST /api/v1/leads</H3>
      <P>Create a lead.</P>
      <CodeBlock language="bash">{`curl -H "Authorization: Bearer $SONAR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Jane Doe","companyName":"Acme","status":"DISCOVERY"}' \\
  https://sonar.vercel.app/api/v1/leads`}</CodeBlock>
      <P>
        Required scope: <InlineCode>leads:write</InlineCode>. Returns the created lead with status
        201.
      </P>

      <H2>Agent runs</H2>

      <H3>POST /api/v1/runs</H3>
      <P>
        Start an agent run. Returns 202 with the run id; poll{" "}
        <InlineCode>GET /api/v1/runs/{`{id}`}</InlineCode> for progress.
      </P>
      <CodeBlock language="bash">{`curl -H "Authorization: Bearer $SONAR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"leadId":"<uuid>","callId":"<uuid>"}' \\
  https://sonar.vercel.app/api/v1/runs`}</CodeBlock>
      <P>
        Required scope: <InlineCode>runs:write</InlineCode>.
      </P>

      <H3>GET /api/v1/runs/{`{id}`}</H3>
      <P>Fetch a run with its step outputs.</P>
      <CodeBlock language="json">{`{
  "data": {
    "id": "ab12...",
    "status": "AWAITING_APPROVAL",
    "leadId": "8c5a...",
    "callId": "df3a...",
    "startedAt": "...",
    "completedAt": "...",
    "traceUrl": "https://smith.langchain.com/...",
    "steps": [
      { "node": "RESEARCH", "status": "COMPLETED", "output": { ... } },
      { "node": "ANALYSIS", "status": "COMPLETED", "output": { ... } },
      { "node": "STRATEGY", "status": "COMPLETED", "output": { ... } },
      { "node": "WRITER",   "status": "COMPLETED", "output": { ... } }
    ],
    "emailDraft": { "id": "...", "status": "DRAFT", "subject": "..." }
  }
}`}</CodeBlock>
      <P>
        Required scope: <InlineCode>runs:read</InlineCode>.
      </P>
    </article>
  );
}
