import { Activity, ArrowRight, Check, Code, Send, Shield, Users } from "lucide-react";
import Link from "next/link";

import { MarketingEffects } from "@/components/marketing/marketing-effects";
import { createServerSupabase } from "@/lib/supabase/server";

import styles from "./page.module.css";

const SCREEN = "/marketing/screens";

function LogoMark() {
  return (
    <span className={styles.logoMark} aria-hidden>
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      >
        <path d="M5.8 12A6 6 0 0 1 12 17.8" />
        <path d="M5.6 7A11 11 0 0 1 17 17.6" />
        <path d="M5.4 2A16 16 0 0 1 22 17.4" />
        <circle cx="6" cy="18" r="2.1" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

const RUN_STEPS = [
  { title: "Open a lead", body: "Pick a B2B contact from your pipeline." },
  { title: "Attach a call", body: "Drag in the recording — it transcribes automatically." },
  { title: "Generate", body: "The five-node agent run drafts a cited email." },
  { title: "Verify", body: "Click any citation to check its source segment." },
  { title: "Approve & send", body: "Ship via Resend and track delivery." },
];

export default async function HomePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = !!user;

  const ctaHref = isAuthed ? "/dashboard" : "/signup";
  const ctaLabel = isAuthed ? "Open dashboard" : "Try the demo";

  return (
    <main className={styles.page}>
      <MarketingEffects />

      <nav className={styles.nav} data-marketing-nav>
        <div className={`${styles.wrap} ${styles.navIn}`}>
          <Link href="/" className={styles.logo}>
            <LogoMark />
            Sonar
          </Link>
          <div className={styles.navLinks}>
            <Link href="#features">Product</Link>
            <Link href="#how">How it works</Link>
            <Link href="/docs">Docs</Link>
          </div>
          <div className={styles.navCta}>
            {isAuthed ? null : (
              <Link href="/login" className={styles.signIn}>
                Sign in
              </Link>
            )}
            <Link href={ctaHref} className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}>
              {ctaLabel}
            </Link>
          </div>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.wrap}>
          <div className={styles.reveal}>
            <span className={styles.eyebrow}>Multi-agent sales follow-ups</span>
          </div>
          <h1 className={styles.reveal} style={{ animationDelay: "60ms" }}>
            Send the follow-up
            <br />
            before the call goes <span className={styles.grad}>cold.</span>
          </h1>
          <p className={`${styles.heroLede} ${styles.reveal}`} style={{ animationDelay: "120ms" }}>
            Sonar turns a recorded sales call into a ready-to-send, cited follow-up email — drafted
            by a five-node agent and verified line-by-line against the transcript.
          </p>
          <div className={`${styles.heroCta} ${styles.reveal}`} style={{ animationDelay: "180ms" }}>
            <Link href={ctaHref} className={`${styles.btn} ${styles.btnPrimary}`}>
              {ctaLabel}
            </Link>
            <Link href="/docs" className={`${styles.btn} ${styles.btnGhost}`}>
              Read the docs <ArrowRight size={15} />
            </Link>
          </div>
          <div
            className={`${styles.heroNote} ${styles.reveal}`}
            style={{ animationDelay: "240ms" }}
          >
            No credit card · transcribes &amp; drafts in under a minute
          </div>
          <div
            className={`${styles.heroShot} ${styles.reveal}`}
            style={{ animationDelay: "120ms" }}
            data-marketing-parallax
          >
            <div className={styles.frame}>
              <div className={styles.frameBar}>
                <div className={styles.dots}>
                  <i />
                  <i />
                  <i />
                </div>
                <div className={styles.frameUrl}>
                  <span>app.sonar.com/dashboard</span>
                </div>
              </div>
              <div className={styles.shot} data-marketing-shot>
                <iframe
                  src={`${SCREEN}/dashboard/full-screen-1440-900-light.html`}
                  title="Sonar dashboard"
                  tabIndex={-1}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="features" className={`${styles.band} ${styles.reveal}`}>
        <div className={styles.wrap}>
          <div className={styles.featGrid}>
            <div className={styles.featCopy}>
              <span className={styles.eyebrow}>The run</span>
              <h2>Watch every agent think.</h2>
              <p className={styles.featLede}>
                Research, Analysis, Strategy, Writer — five specialized nodes run with shared state
                and live progress. No black box; you see each step land in real time.
              </p>
              <ul className={styles.featList}>
                <li>
                  <Check size={16} strokeWidth={2.4} />
                  Live per-node status, pulse and freshness
                </li>
                <li>
                  <Check size={16} strokeWidth={2.4} />
                  Structured outputs — never a JSON dump
                </li>
                <li>
                  <Check size={16} strokeWidth={2.4} />
                  Retry or regenerate any step
                </li>
              </ul>
            </div>
            <div>
              <div className={styles.frame}>
                <div className={styles.frameBar}>
                  <div className={styles.dots}>
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className={styles.frameUrl}>
                    <span>app.sonar.com/runs/4821</span>
                  </div>
                </div>
                <div className={styles.shot} data-marketing-shot>
                  <iframe
                    src={`${SCREEN}/agent-pipeline/full-screen-dark.html`}
                    title="Agent run pipeline"
                    loading="lazy"
                    tabIndex={-1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.feat}>
        <div className={styles.wrap}>
          <div className={`${styles.featGrid} ${styles.featRev}`}>
            <div className={styles.featCopy}>
              <span className={styles.eyebrow}>Trust</span>
              <h2>Every line, cited to the call.</h2>
              <p className={styles.featLede}>
                The draft links each claim back to the exact transcript segment it came from. Hover
                a citation, see the source. Verifying an AI-written email takes seconds, not a
                re-read.
              </p>
              <ul className={styles.featList}>
                <li>
                  <Check size={16} strokeWidth={2.4} />
                  Email ↔ transcript split view
                </li>
                <li>
                  <Check size={16} strokeWidth={2.4} />
                  Click a citation to jump to its segment
                </li>
                <li>
                  <Check size={16} strokeWidth={2.4} />
                  Edit, regenerate, approve &amp; send via Resend
                </li>
              </ul>
            </div>
            <div>
              <div className={styles.frame}>
                <div className={styles.frameBar}>
                  <div className={styles.dots}>
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className={styles.frameUrl}>
                    <span>app.sonar.com/emails/approve</span>
                  </div>
                </div>
                <div className={styles.shot} data-marketing-shot>
                  <iframe
                    src={`${SCREEN}/email-approval/full-screen-1440-900-light.html`}
                    title="Email approval"
                    loading="lazy"
                    tabIndex={-1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.feat} style={{ paddingTop: 0 }}>
        <div className={styles.wrap}>
          <div className={styles.featGrid}>
            <div className={styles.featCopy}>
              <span className={styles.eyebrow}>Pipeline</span>
              <h2>Run your whole pipeline.</h2>
              <p className={styles.featLede}>
                Board or table, drag to move stages, filter by owner, multi-select to act in bulk.
                Built for reps who live in it all day — keyboard-first and calm.
              </p>
              <ul className={styles.featList}>
                <li>
                  <Check size={16} strokeWidth={2.4} />
                  Kanban with drag-and-drop &amp; touch fallback
                </li>
                <li>
                  <Check size={16} strokeWidth={2.4} />
                  Grouped, sortable table with batch actions
                </li>
                <li>
                  <Check size={16} strokeWidth={2.4} />
                  Soft-delete with 30-day restore
                </li>
              </ul>
            </div>
            <div>
              <div className={styles.frame}>
                <div className={styles.frameBar}>
                  <div className={styles.dots}>
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className={styles.frameUrl}>
                    <span>app.sonar.com/leads</span>
                  </div>
                </div>
                <div className={styles.shot} data-marketing-shot>
                  <iframe
                    src={`${SCREEN}/leads/full-screen-1440-900-light.html`}
                    title="Leads board"
                    loading="lazy"
                    tabIndex={-1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className={styles.steps}>
        <div className={styles.wrap}>
          <div className={styles.stepsHead}>
            <span className={`${styles.eyebrow} ${styles.eyebrowCenter}`}>The loop</span>
            <h2>How a run works</h2>
          </div>
          <div className={styles.stepsGrid}>
            {RUN_STEPS.map((step) => (
              <div key={step.title} className={styles.step}>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.loop}>
        <div className={styles.wrap}>
          <div className={styles.loopHead}>
            <span className={`${styles.eyebrow} ${styles.eyebrowCenter}`}>The platform</span>
            <h2>Everything around the loop.</h2>
          </div>
          <div className={styles.loopHero}>
            <div className={styles.copy}>
              <span className={styles.lcardIc}>
                <Users size={18} />
              </span>
              <h3>Built for teams</h3>
              <p>
                Multi-tenant workspaces, roles and a workspace switcher — everything is org-scoped
                by default, with an audit trail behind every action.
              </p>
            </div>
            <div className={styles.lcardMedia}>
              <div className={styles.shot} data-marketing-shot>
                <iframe
                  src={`${SCREEN}/settings/full-screen-1440-900-light.html`}
                  title="Workspace settings"
                  loading="lazy"
                  tabIndex={-1}
                />
              </div>
            </div>
          </div>
          <div className={styles.loopRow}>
            <div className={styles.lcard}>
              <span className={styles.lcardIc}>
                <Code size={18} />
              </span>
              <h3>Ships with an API</h3>
              <p>Scoped bearer keys, signed webhooks and a full REST reference.</p>
              <div className={styles.lcardCode}>
                {'curl https://api.sonar.app/v1/leads \\\n  -H "Authorization: Bearer sk_live_…"'}
              </div>
            </div>
            <div className={styles.lcard}>
              <span className={styles.lcardIc}>
                <Send size={18} />
              </span>
              <h3>Delivery, tracked</h3>
              <div className={styles.stat}>99.9%</div>
              <p>Sent → delivered or bounced, end-to-end via Resend.</p>
              <div className={styles.lpills}>
                <span className={styles.lpill}>
                  <i style={{ background: "var(--emerald-solid)" }} />
                  Sent
                </span>
                <span className={styles.lpill}>
                  <i style={{ background: "var(--emerald-solid)" }} />
                  Delivered
                </span>
                <span className={styles.lpill}>
                  <i style={{ background: "var(--rose-solid)" }} />
                  Bounced
                </span>
              </div>
            </div>
            <div className={styles.lcard}>
              <span className={styles.lcardIc}>
                <Activity size={18} />
              </span>
              <h3>Run history</h3>
              <p>Every agent run, filterable by status and date.</p>
              <div className={styles.lpills}>
                <span className={styles.lpill}>
                  <i style={{ background: "var(--primary)" }} />
                  Running
                </span>
                <span className={styles.lpill}>
                  <i style={{ background: "var(--emerald-solid)" }} />
                  Completed
                </span>
                <span className={styles.lpill}>
                  <i style={{ background: "var(--amber-solid)" }} />
                  Awaiting
                </span>
              </div>
            </div>
            <div className={styles.lcard}>
              <span className={styles.lcardIc}>
                <Shield size={18} />
              </span>
              <h3>Audit log</h3>
              <p>Who did what, with machine-readable codes.</p>
              <div className={styles.llog}>
                <b>alex</b> · <em>email.approved</em>
                <br />
                <b>priya</b> · <em>lead.updated</em>
                <br />
                <b>alex</b> · <em>apikey.created</em>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.wrap}>
          <div className={styles.ctaCard}>
            <h2>Stop losing deals to slow follow-up.</h2>
            <p>Spin up a workspace, drop in a call, and watch the agents draft your next email.</p>
            <div className={styles.heroCta} style={{ justifyContent: "center" }}>
              <Link href={ctaHref} className={`${styles.btn} ${styles.btnPrimary}`}>
                {ctaLabel}
              </Link>
              <Link href="/docs" className={`${styles.btn} ${styles.btnGhost}`}>
                Read the docs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.foot}`}>
          <div>
            <Link href="/" className={styles.logo}>
              <LogoMark />
              Sonar
            </Link>
            <div className={styles.footTagline}>
              Cited sales follow-ups, drafted by agents and verified against the call.
            </div>
          </div>
          <div className={styles.footCols}>
            <div className={styles.footCol}>
              <h4>Product</h4>
              <Link href="#features">Overview</Link>
              <Link href="/dashboard">Dashboard</Link>
            </div>
            <div className={styles.footCol}>
              <h4>Developers</h4>
              <Link href="/docs">Docs</Link>
              <Link href="/docs/api-reference">API reference</Link>
              <Link href="/docs/webhooks">Webhooks</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
