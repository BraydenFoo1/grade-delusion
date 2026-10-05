import { slogans } from "@/lib/site";

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {slogans.map((s) => (
        <li key={s} className="flex items-center whitespace-nowrap">
          <span className="px-6 font-display text-2xl uppercase tracking-wide sm:text-3xl">{s}</span>
          <span className="text-2xl text-hot" aria-hidden>
            ✦
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Marquee() {
  return (
    <div className="overflow-hidden bg-[linear-gradient(var(--sun)_50%,var(--paper)_50%)] py-3">
      <div className="marquee-wrap -mx-6 -rotate-[1.5deg] border-y-[3px] border-ink bg-ink py-4 text-sun">
        <div className="marquee flex w-max">
          <Row />
          <Row hidden />
        </div>
      </div>
    </div>
  );
}
