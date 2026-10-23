const items = [
  {
    t: "Plain reasons, before it is sent",
    d: "If a payment will be paused, you see why in simple words first, and you choose: cancel it, or ask your guardian to check.",
  },
  {
    t: "A pause, not a block",
    d: "New person, reported person, or over your limits? The money waits safely. Nothing is ever pulled back from anyone.",
  },
  {
    t: "Rules decide, people approve",
    d: "Pauses come from fixed contract rules. Only the guardian's Face ID can release a paused payment. AI only explains.",
  },
  {
    t: "A guided review for the guardian",
    d: "Why it was paused, what it is for, the reports, a short checklist, and a Call button that only uses the number saved at setup.",
  },
  {
    t: "Honest reports",
    d: "Every report shows its source, date and whether it is verified. No reports means \"No reports found\", never \"safe\".",
  },
  {
    t: "Fails safe",
    d: "If nobody answers, the pause expires and the money returns to the sender automatically.",
  },
  {
    t: "Made for older eyes",
    d: "Large text and big buttons, a Large text switch, and no crypto words on the main screens.",
  },
];

export default function Safeguards() {
  return (
    <section id="safeguards" className="scroll-mt-20 bg-brand-tint py-24">
      <div className="mx-auto max-w-[1680px] px-5 md:px-8 2xl:px-16">
        <div className="max-w-[640px]">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-brand-deep">Safeguards</p>
          <h2 className="mt-3 font-grotesk text-[clamp(30px,4vw,46px)] font-extrabold leading-[1.05] tracking-[-0.025em]">
            What happens <span className="font-accent text-brand-deep">behind the screen</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:gap-8">
          {items.map((it, i) => (
            <div key={it.t} className="rounded-3xl border border-line bg-white p-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-ibm-mono text-[14px] font-bold text-brand-ink">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-5 font-grotesk text-[20px] font-bold">{it.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-muted 2xl:text-[17px]">{it.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
