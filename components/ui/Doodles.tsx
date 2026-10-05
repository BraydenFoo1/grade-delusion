import type { CSSProperties, ReactNode } from "react";
import type { Particle } from "@/lib/hooks";
import { cn, vars } from "@/lib/utils";

type DoodleProps = { className?: string; style?: CSSProperties };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function Star({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 50 50" aria-hidden className={className} style={style}>
      <path
        d="M25 3l6.2 14.6 15.8 1.3-12 10.3 3.7 15.5L25 36.4l-13.7 8.3L15 29.2 3 18.9l15.8-1.3z"
        fill="currentColor"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sparkle({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 50 50" aria-hidden className={className} style={style}>
      <path
        d="M25 2C27 18 32 23 48 25 32 27 27 32 25 48 23 32 18 27 2 25 18 23 23 18 25 2Z"
        fill="currentColor"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Arrow({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 120 80" aria-hidden className={cn("draw", className)} style={style}>
      <path pathLength={1} d="M6 62C26 18 72 4 106 28" {...stroke} strokeWidth="4.5" />
      <path pathLength={1} d="M88 16l19 13-15 16" {...stroke} strokeWidth="4.5" />
    </svg>
  );
}

export function Squiggle({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 120 30" aria-hidden className={cn("draw", className)} style={style}>
      <path
        pathLength={1}
        d="M3 15q9-14 18 0t18 0 18 0 18 0 18 0 18 0 18 0"
        {...stroke}
        strokeWidth="5"
      />
    </svg>
  );
}

export function MarkerCircle({ className, style }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 300 100"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("draw pointer-events-none", className)}
      style={style}
    >
      <path
        pathLength={1}
        d="M160 9C70 4 10 22 10 52s96 44 168 38 116-26 112-52S206 0 118 12"
        {...stroke}
        strokeWidth="5"
       
      />
    </svg>
  );
}

export function Underline({ className, style }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 300 24"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("draw pointer-events-none", className)}
      style={style}
    >
      <path pathLength={1} d="M4 14C70 4 160 4 296 10" {...stroke} strokeWidth="6" />
      <path pathLength={1} d="M40 21C110 14 200 14 270 18" {...stroke} strokeWidth="4" />
    </svg>
  );
}

/** Paint splash blob with droplets. */
export function Splash({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden className={className} style={style}>
      <g fill="currentColor">
        <path d="M101 22c14 0 17 20 31 17s24-13 31 1-8 26 3 36 26 11 20 26-26 8-28 22 10 30-5 36-23-11-35-4-12 30-28 27-12-22-27-26-30 9-34-6 13-22 6-33-27-10-22-25 24-8 25-24-13-30 1-38 22 9 33 2 13-31 29-31z" />
        <circle cx="178" cy="44" r="8" />
        <circle cx="26" cy="150" r="6" />
        <circle cx="160" cy="176" r="5" />
        <circle cx="38" cy="30" r="4" />
      </g>
    </svg>
  );
}

export function Floating({
  children,
  className,
  dur = 6,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  dur?: number;
  delay?: number;
}) {
  return (
    <span
      aria-hidden
      className={cn("float pointer-events-none absolute select-none", className)}
      style={vars({ "--dur": `${dur}s`, "--delay": `${delay}s` })}
    >
      {children}
    </span>
  );
}

export function BurstLayer({ parts, className }: { parts: Particle[]; className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0 z-20", className)}>
      {parts.map((p) => (
        <span
          key={p.id}
          className="burst-particle"
          style={vars({ "--tx": `${p.tx}px`, "--ty": `${p.ty}px`, "--rot": `${p.rot}deg` })}
        >
          {p.char}
        </span>
      ))}
    </span>
  );
}

export function Eyebrow({ n, children, className }: { n: string; children: ReactNode; className?: string }) {
  return (
    <p className={cn("mb-4 inline-flex items-center gap-3 font-hand text-2xl sm:text-3xl", className)}>
      <span className="grid size-9 place-items-center rounded-full border-2 border-current font-sans text-xs font-bold">
        {n}
      </span>
      {children}
    </p>
  );
}
