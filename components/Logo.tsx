import TrademarkEgg from "./eggs/TrademarkEgg";
import { cn } from "@/lib/utils";

export default function Logo({
  className,
  onClick,
  href = "#top",
}: {
  className?: string;
  onClick?: () => void;
  href?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-display text-xl uppercase leading-none tracking-wide sm:text-2xl",
        className,
      )}
    >
      <a href={href} onClick={onClick} aria-label="Grade Delusion home" className="group inline-flex items-center gap-1.5">
        <span>Grade</span>
        <span className="inline-block -rotate-2 rounded-md bg-ink px-1.5 pb-0.5 pt-1 text-sun transition-transform duration-200 group-hover:rotate-2 group-hover:scale-105">
          Delusion
        </span>
      </a>
      {/* Kept outside the link so normal logo clicks can never trigger it. */}
      <TrademarkEgg className="-ml-0.5 self-start font-sans text-[0.55em] font-bold" />
    </span>
  );
}
