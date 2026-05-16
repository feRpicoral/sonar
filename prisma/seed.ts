// Demo seed - populates the workspace owned by a real Supabase auth user
// with sample leads, a call with transcript, and audit entries.
//
//   yarn seed                                # interactive menu (recommended)
//   DEMO_USER_ID=<uuid> yarn seed            # non-interactive
//
// We run via `yarn seed` rather than `yarn prisma db seed` because Prisma's
// child-process spawning swallows stdin in some setups, which breaks the
// interactive prompt. The script is still wired up under prisma.config.ts
// for environments where `prisma db seed` is preferred.

import { input, select } from "@inquirer/prompts";
import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import pc from "picocolors";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Supabase connection strings.",
  );
}
if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
}
if (!supabaseServiceKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AuthUserSummary {
  id: string;
  email: string;
  name: string;
}

function makeAdminClient(): SupabaseClient {
  return createSupabaseClient(supabaseUrl!, supabaseServiceKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function summarize(u: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): AuthUserSummary {
  const meta = (u.user_metadata ?? {}) as { full_name?: unknown; name?: unknown };
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    u.email ||
    u.id;
  return { id: u.id, email: u.email ?? "(no email)", name };
}

async function listSupabaseUsers(): Promise<AuthUserSummary[]> {
  const admin = makeAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 100 });
  if (error) throw error;
  return data.users.map(summarize);
}

async function fetchSupabaseUser(userId: string): Promise<AuthUserSummary> {
  const admin = makeAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    throw new Error(
      `No Supabase auth user with id ${userId}. Sign up via the app first, then re-run the seed.`,
    );
  }
  return summarize(data.user);
}

async function resolveDemoUser(): Promise<AuthUserSummary> {
  const fromEnv = process.env.DEMO_USER_ID?.trim();
  if (fromEnv) {
    if (!UUID_REGEX.test(fromEnv)) {
      throw new Error(`DEMO_USER_ID is not a valid UUID: ${fromEnv}`);
    }
    return fetchSupabaseUser(fromEnv);
  }

  const method = await select<"browse" | "manual">({
    message: "How do you want to pick the demo user?",
    choices: [
      { name: "Browse Supabase users (recommended)", value: "browse" },
      { name: "Enter UUID manually", value: "manual" },
    ],
    default: "browse",
  });

  if (method === "manual") {
    const id = await input({
      message: "Supabase user UUID:",
      validate: (v) => UUID_REGEX.test(v.trim()) || "Not a valid UUID",
    });
    return fetchSupabaseUser(id.trim());
  }

  process.stdout.write(pc.dim("Loading users from Supabase...\n"));
  const users = await listSupabaseUsers();
  if (users.length === 0) {
    throw new Error("No Supabase users found. Sign up via the app first.");
  }

  const selectedId = await select<string>({
    message: "Pick a user:",
    pageSize: 12,
    choices: users.map((u) => ({
      name: `${u.name}  ${pc.dim(`<${u.email}>`)}  ${pc.gray(u.id)}`,
      value: u.id,
      short: u.name,
    })),
  });

  return users.find((u) => u.id === selectedId)!;
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const LEADS: Array<{
  name: string;
  companyName: string;
  companyWebsite: string;
  status: "DISCOVERY" | "QUALIFIED" | "DEMO" | "PROPOSAL" | "CLOSED";
}> = [
  {
    name: "Sarah Chen",
    companyName: "Acme Robotics",
    companyWebsite: "https://acmerobotics.com",
    status: "DISCOVERY",
  },
  {
    name: "Marcus Patel",
    companyName: "Vertex Health",
    companyWebsite: "https://vertexhealth.io",
    status: "DISCOVERY",
  },
  {
    name: "Elena Ruiz",
    companyName: "Northstar Logistics",
    companyWebsite: "https://northstar.co",
    status: "QUALIFIED",
  },
  {
    name: "David Kim",
    companyName: "Pinecone Analytics",
    companyWebsite: "https://pinecone.dev",
    status: "QUALIFIED",
  },
  {
    name: "Priya Singh",
    companyName: "Lumen Energy",
    companyWebsite: "https://lumen-energy.com",
    status: "DEMO",
  },
  {
    name: "James O'Brien",
    companyName: "Cascade Software",
    companyWebsite: "https://cascade.io",
    status: "DEMO",
  },
  {
    name: "Aisha Hassan",
    companyName: "Meridian Bank",
    companyWebsite: "https://meridianbank.com",
    status: "PROPOSAL",
  },
  {
    name: "Carlos Vega",
    companyName: "Stellar Aerospace",
    companyWebsite: "https://stellaraero.com",
    status: "PROPOSAL",
  },
  {
    name: "Yuki Tanaka",
    companyName: "Bloom Retail",
    companyWebsite: "https://bloomretail.co",
    status: "CLOSED",
  },
  {
    name: "Olivia Martin",
    companyName: "Atlas Insurance",
    companyWebsite: "https://atlasinsure.com",
    status: "CLOSED",
  },
];

const SAMPLE_TRANSCRIPT_SEGMENTS = [
  {
    start: 0,
    end: 8.2,
    text: "Hey Sarah, thanks for making time. Want to start with what's top of mind for you on observability?",
  },
  {
    start: 8.4,
    end: 22.1,
    text: "Yeah, so the big thing is we just hired three new SREs after our Series B and the on-call rotation has been brutal. We're paying for Datadog but only half the team actually uses it.",
  },
  {
    start: 22.3,
    end: 38.7,
    text: "That's super common. What does your current incident workflow look like - like when something fires at 2am, who picks it up and what do they look at first?",
  },
  {
    start: 39.0,
    end: 58.4,
    text: "Usually it's whoever's on-call paging the team lead, then we spend ten or fifteen minutes just figuring out which dashboard to open. That's the part that's killing morale.",
  },
  {
    start: 58.6,
    end: 72.3,
    text: "Got it. And in terms of budget - are you the decision maker here or is this something Marcus signs off on?",
  },
  {
    start: 72.5,
    end: 84.9,
    text: "Marcus signs the contract but he listens to the team on tooling. If we get to a $40K ARR price point I can probably make that happen without escalating.",
  },
  {
    start: 85.1,
    end: 102.0,
    text: "Okay, that's helpful. One more - are you evaluating other vendors right now or is this still in scoping mode?",
  },
  {
    start: 102.2,
    end: 115.5,
    text: "We're talking to Honeycomb and Grafana Cloud too, but honestly we want something that just works out of the box. Time-to-value is what'll make the call.",
  },
];

function step(message: string): void {
  console.log(`${pc.dim(">")} ${message}`);
}

async function main(): Promise<void> {
  console.log(pc.bold("\nSonar demo seed\n"));

  const demoUser = await resolveDemoUser();
  console.log(`\n${pc.green("Using")} ${pc.bold(demoUser.name)} ${pc.dim(`<${demoUser.email}>`)}`);
  console.log(`${pc.dim("id:")} ${pc.gray(demoUser.id)}\n`);

  step("Upserting user mirror in public.users");
  const user = await prisma.user.upsert({
    where: { id: demoUser.id },
    create: {
      id: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
      avatarUrl: null,
    },
    update: { email: demoUser.email, name: demoUser.name },
  });
  step(`User row ok (${pc.gray(user.id)})`);

  step("Upserting organization 'sonar-demo'");
  const org = await prisma.organization.upsert({
    where: { slug: "sonar-demo" },
    create: { name: "Sonar Demo Co", slug: "sonar-demo" },
    update: {},
  });
  step(`Organization ok (${pc.gray(org.id)})`);

  step("Upserting membership (admin)");
  await prisma.membership.upsert({
    where: { orgId_userId: { orgId: org.id, userId: user.id } },
    create: { orgId: org.id, userId: user.id, role: "ADMIN" },
    update: { role: "ADMIN" },
  });
  step("Membership ok");

  step("Clearing existing leads (cascades to calls)");
  const deleted = await prisma.lead.deleteMany({ where: { orgId: org.id } });
  step(`Deleted ${deleted.count} existing leads`);

  step(`Creating ${LEADS.length} sample leads`);
  const leads = await Promise.all(
    LEADS.map((spec) =>
      prisma.lead.create({
        data: {
          orgId: org.id,
          name: spec.name,
          companyName: spec.companyName,
          companyWebsite: spec.companyWebsite,
          status: spec.status,
          assignedToUserId: user.id,
          createdByUserId: user.id,
        },
      }),
    ),
  );
  step(`Created ${leads.length} leads`);

  const firstLead = leads[0]!;
  step(`Attaching demo call to ${firstLead.name}`);
  await prisma.call.create({
    data: {
      orgId: org.id,
      leadId: firstLead.id,
      audioPath: `audio/${org.id}/demo-call.bin`,
      durationSec: 116,
      transcriptText: SAMPLE_TRANSCRIPT_SEGMENTS.map((s) => s.text).join(" "),
      segments: SAMPLE_TRANSCRIPT_SEGMENTS as never,
      createdByUserId: user.id,
    },
  });
  step("Call with transcript attached");

  step("Writing audit log entries");
  await prisma.auditLog.createMany({
    data: [
      {
        orgId: org.id,
        actorUserId: user.id,
        action: "org.created",
        targetType: "organization",
        targetId: org.id,
        metadata: { name: org.name, slug: org.slug } as never,
        ip: null,
        userAgent: null,
      },
      ...leads.map((l) => ({
        orgId: org.id,
        actorUserId: user.id,
        action: "lead.created",
        targetType: "lead",
        targetId: l.id,
        metadata: { name: l.name, status: l.status } as never,
        ip: null,
        userAgent: null,
      })),
    ],
  });
  step(`Wrote ${leads.length + 1} audit entries`);

  console.log(
    `\n${pc.green(pc.bold("Done."))} Open the app at ${pc.cyan("http://localhost:3000/leads")}.\n`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(
      `\n${pc.red("Seed failed:")} ${err instanceof Error ? err.message : String(err)}\n`,
    );
    await prisma.$disconnect();
    process.exit(1);
  });
