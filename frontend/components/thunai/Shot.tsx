/** A real screenshot of the SafeSend app, in a phone frame. */
export default function Shot({ src, label }: { src: string; label: string }) {
  return (
    <figure className="mx-auto w-[252px] shrink-0 xl:[zoom:1.1] 2xl:[zoom:1.25]" aria-label={label}>
      <div className="relative rounded-[42px] border-[10px] border-ink bg-ink shadow-[0_30px_60px_-20px_rgba(0,122,30,0.35)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className="block h-auto w-full rounded-[32px]" />
      </div>
    </figure>
  );
}
