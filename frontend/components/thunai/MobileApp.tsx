import type { ReactNode } from "react";
import { APP_URL, appLinkProps } from "@/lib/app";
import Shot from "./Shot";

type Step = {
  n: string;
  who: "Protected user" | "Guardian" | "Both";
  title: string;
  body: string;
  points: string[];
  screens: ReactNode;
};

const pair = (a: ReactNode, b: ReactNode) => (
  <div className="flex flex-col items-center gap-6 xl:flex-row">
    {a}
    {b}
  </div>
);

/** Every screen below is a real screenshot of the app, taken during a run on Monad testnet. */
const steps: Step[] = [
  {
    n: "01",
    who: "Both",
    title: "Set up with one Face ID each",
    body: "Mdm Tan signs up and invites her son, Wei Ming. He accepts and sets the rules once.",
    points: ["No password, no seed phrase.", "Anyone new, or over $1,000, asks Wei Ming first."],
    screens: pair(<Shot src="/screens/welcome.png" label="Sign up" />, <Shot src="/screens/limits.png" label="Set the limits" />),
  },
  {
    n: "02",
    who: "Protected user",
    title: "Say what it is for",
    body: "Every payment to someone new starts with one question. \"Someone asked me to\" is the clearest scam sign there is.",
    points: ["Six simple choices.", "Wei Ming sees the answer."],
    screens: pair(<Shot src="/screens/send.png" label="Send money" />, <Shot src="/screens/warning.png" label="Paused, with reasons" />),
  },
  {
    n: "03",
    who: "Guardian",
    title: "A guided review",
    body: "Wei Ming sees why it was paused, what it is for, real reports, and a short checklist.",
    points: ["Reports show where they came from and when.", "Call uses only the number he saved."],
    screens: pair(<Shot src="/screens/review.png" label="Guardian review" />, <Shot src="/screens/checklist.png" label="Checklist and Stop" />),
  },
  {
    n: "04",
    who: "Guardian",
    title: "Stop it, or approve it",
    body: "Stop sends the money straight back. Approve needs a tick: \"I spoke to her and checked this.\"",
    points: ["Checked by Face ID inside the contract.", "No answer? The money comes back by itself."],
    screens: pair(<Shot src="/screens/stopped.png" label="Stopped" />, <Shot src="/screens/approved.png" label="Approved" />),
  },
  {
    n: "05",
    who: "Protected user",
    title: "Pressured outside the app?",
    body: "One quiet tap tells her family and pauses her money, even for gift cards or bank transfers.",
    points: ["Wei Ming can video call her at once."],
    screens: <Shot src="/screens/sos.png" label="Silent SOS" />,
  },
];

export default function MobileApp() {
  return (
    <section id="app" className="scroll-mt-20 bg-white py-24">
      <div className="mx-auto max-w-[1680px] px-5 md:px-8 2xl:px-16">
        <div className="mx-auto max-w-[980px] text-center">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-brand-deep">The mobile app</p>
          <h2 className="mt-3 font-grotesk text-[clamp(32px,4.6vw,68px)] font-extrabold leading-[1.05] tracking-[-0.025em]">
            One app. Two people. <span className="font-accent text-brand-deep">One pause that matters.</span>
          </h2>
          <p className="mt-5 text-[18px] leading-relaxed text-ink-muted">
            Mdm Tan and Wei Ming use the same app, each on their own phone. These are real screens from the app.
          </p>
        </div>

        <div className="mt-20 space-y-24">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 2xl:gap-28 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-ibm-mono text-[14px] font-bold text-brand-deep">{s.n}</span>
                  <span className="h-px w-10 bg-brand" />
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-[12px] font-bold text-brand-ink">
                    {s.who}
                  </span>
                </div>
                <h3 className="mt-4 font-grotesk text-[clamp(26px,3.2vw,36px)] font-bold leading-tight tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-4 text-[17px] leading-relaxed text-ink-muted 2xl:text-[20px]">{s.body}</p>
                <ul className="mt-6 space-y-3">
                  {s.points.map((p) => (
                    <li key={p} className="flex gap-3 text-[15px] leading-snug 2xl:text-[17px]">
                      <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-ink">
                        ✓
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-center rounded-[32px] bg-brand-tint py-12">{s.screens}</div>
            </div>
          ))}
        </div>

        <div className="mt-24 flex flex-col items-center rounded-[32px] bg-ink px-6 py-14 text-center text-white">
          <h3 className="font-grotesk text-[clamp(26px,3.6vw,40px)] font-bold tracking-tight">Try it on <span className="font-accent text-brand">your phone</span></h3>
          <p className="mt-3 max-w-[520px] text-[16px] text-white/70">
            Open the app, create a protected user account, then send the invite to a second device to play the guardian.
          </p>
          <a
            href={APP_URL}
          {...appLinkProps}
            className="mt-8 inline-flex h-[56px] items-center justify-center rounded-full bg-brand px-10 text-[16px] font-bold text-brand-ink shadow-[0_14px_40px_-10px_rgba(0,255,34,0.9)] transition-colors hover:bg-brand-hover"
          >
            Open the mobile app
          </a>
        </div>
      </div>
    </section>
  );
}
