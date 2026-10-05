import { cn } from "@/lib/utils";

export default function Logo({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <a
      href="#top"
      onClick={onClick}
      aria-label="Grade Delusion home"
      className={cn(
        "group inline-flex items-center gap-1.5 font-display text-xl uppercase leading-none tracking-wide sm:text-2xl",
        className,
      )}
    >
      <span>Grade</span>
      <span className="inline-block -rotate-2 rounded-md bg-ink px-1.5 pb-0.5 pt-1 text-sun transition-transform duration-200 group-hover:rotate-2 group-hover:scale-105">
        Delusion
      </span>
      <span className="-ml-0.5 self-start font-sans text-[0.55em] font-bold">™</span>
    </a>
  );
}
