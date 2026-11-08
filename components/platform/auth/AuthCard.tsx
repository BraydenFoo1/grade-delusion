import type { ReactNode } from "react";

/** Centered card used by every auth screen. One column, generous spacing, nothing competing with the form. */
export default function AuthCard({ title, intro, children, footer }: { title: string; intro?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="pf-title">{title}</h1>
      {intro ? <p className="pf-muted mt-3 text-[1.0625rem]">{intro}</p> : null}
      <div className="pf-card pf-lift mt-8 p-5 sm:p-7">{children}</div>
      {footer ? <p className="pf-muted mt-6 text-center text-[0.9375rem]">{footer}</p> : null}
    </div>
  );
}
