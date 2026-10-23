const faqs = [
  {
    q: "Is it a real mobile app?",
    a: "It runs in your phone's browser and installs to the home screen like an app. Sign-in uses Face ID or a fingerprint. This version runs on a test network with test money only.",
  },
  {
    q: "Who is it for?",
    a: "People who are new to crypto, especially older adults like Mdm Tan (68) and teenagers with their first account, together with a family member they trust, like her son Wei Ming.",
  },
  {
    q: "When is a payment paused?",
    a: "When the recipient is new, when other people have reported them, when one payment is over the limit, or when payments in a period add up past the limit. The contract decides this with fixed rules, not an AI.",
  },
  {
    q: "What if my guardian does not answer?",
    a: "The pause expires and the money comes back to you. It never goes to the recipient.",
  },
  {
    q: "Does \"No reports found\" mean the recipient is safe?",
    a: "No. It only means nobody has reported them to us yet. Every report shows its source, its date and whether it was verified, and you can ask for a wrong report to be corrected.",
  },
  {
    q: "Who can move the money?",
    a: "No company can, including us. Spending needs the protected user's own signature plus the contract's rules, and releasing a paused payment needs the guardian's Face ID. AI only explains; it can never move money.",
  },
  {
    q: "Is this new? Safe and Coinbase already have limits and delays.",
    a: "They do, for people who already understand crypto. SafeSend makes the same protections easy to understand for beginners and their families: simple setup, reasons in plain words and a guided review.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="scroll-mt-20 bg-white py-24">
      <div className="mx-auto max-w-[820px] 2xl:max-w-[1000px] px-5 md:px-8 2xl:px-16">
        <h2 className="text-center font-grotesk text-[clamp(30px,4vw,46px)] font-extrabold tracking-[-0.025em]">Your <span className="font-accent text-brand-deep">questions</span></h2>
        <div className="mt-10 divide-y divide-line rounded-3xl border border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold">
                {f.q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[16px] font-bold text-brand-ink transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
