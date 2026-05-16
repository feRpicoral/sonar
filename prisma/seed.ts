// Demo seed - populates the workspace owned by a real Supabase auth user
// with sample leads, a call with transcript, and audit entries. The user id
// comes from the DEMO_USER_ID env var, or an interactive prompt if unset.
//
//   yarn prisma db seed                          # interactive prompt
//   DEMO_USER_ID=<uuid> yarn prisma db seed      # non-interactive
//
// Find the UUID at: Supabase > Authentication > Users.

import { stdin, stdout } from "node:process";
import readline from "node:readline";

import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Supabase connection strings.",
  );
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveDemoUserId(): Promise<string> {
  const fromEnv = process.env.DEMO_USER_ID?.trim();
  if (fromEnv) {
    if (!UUID_REGEX.test(fromEnv)) {
      throw new Error(`DEMO_USER_ID is not a valid UUID: ${fromEnv}`);
    }
    return fromEnv;
  }

  console.log("\nFind your user id at: Supabase > Authentication > Users\n");

  // Plain callback-style readline. The promises wrapper occasionally hangs
  // when invoked through `prisma db seed` because of how Prisma spawns the
  // child process; the callback API behaves consistently.
  const answer: string = await new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: stdin,
      output: stdout,
      terminal: true,
    });
    rl.question("Demo user id (UUID): ", (input) => {
      rl.close();
      resolve(input);
    });
    rl.on("error", reject);
  });

  const trimmed = answer.trim();
  if (!UUID_REGEX.test(trimmed)) {
    throw new Error(`Not a valid UUID: ${trimmed || "(empty)"}`);
  }
  return trimmed;
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
  console.log(`  > ${message}`);
}

async function main() {
  step("Resolving demo user id");
  const demoUserId = await resolveDemoUserId();
  step(`Using user id ${demoUserId}`);

  step("Upserting user mirror in public.users");
  const user = await prisma.user.upsert({
    where: { id: demoUserId },
    create: {
      id: demoUserId,
      email: "demo@sonar.dev",
      name: "Demo Rep",
      avatarUrl: null,
    },
    update: { email: "demo@sonar.dev", name: "Demo Rep" },
  });
  step(`User row ok (${user.id})`);

  step("Upserting organization 'sonar-demo'");
  const org = await prisma.organization.upsert({
    where: { slug: "sonar-demo" },
    create: { name: "Sonar Demo Co", slug: "sonar-demo" },
    update: {},
  });
  step(`Organization ok (${org.id})`);

  step("Upserting membership (admin)");
  await prisma.membership.upsert({
    where: { orgId_userId: { orgId: org.id, userId: user.id } },
    create: { orgId: org.id, userId: user.id, role: "ADMIN" },
    update: { role: "ADMIN" },
  });
  step("Membership ok");

  step("Clearing existing leads (and cascading calls)");
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

  // Attach a sample call with transcript to the first lead so the demo flow
  // can immediately "Generate follow-up".
  const firstLead = leads[0]!;
  step(`Attaching demo call to first lead (${firstLead.name})`);
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

  console.log("\nSeed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
