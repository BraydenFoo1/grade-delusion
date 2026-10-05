import { business, legal, site } from "@/lib/site";

const links = [
  { href: "/#top", label: "Home" },
  { href: "/#feed", label: "Memes" },
  { href: "/#generator", label: "Delusion Generator" },
  { href: "/#about", label: "About" },
  { href: "/#socials", label: "Socials" },
  { href: `mailto:${site.email}`, label: "Contact" },
];

const legalLinks = [
  { href: legal.privacy, label: "Privacy Policy" },
  { href: legal.terms, label: "Terms of Use" },
  { href: `${legal.privacy}#your-rights`, label: "Data requests" },
];

export default function Footer() {
  return (
    <footer className="bg-ink pb-10 pt-20 text-paper">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="font-display text-[clamp(3.25rem,12vw,8rem)] uppercase leading-[0.85]">
              Grade
              <br />
              <span className="text-sun">Delusion</span>
              <span className="align-top font-sans text-[0.3em] font-bold">™</span>
            </p>
            <p className="mt-6 font-marker text-2xl sm:text-3xl">“{site.tagline}”</p>
            <p className="mt-4 text-paper/75">
              Powered by{" "}
              <a
                href={site.gradeSolutionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-paper underline decoration-mint decoration-2 underline-offset-4 hover:text-mint"
              >
                Grade Solution
              </a>
              .
            </p>
          </div>

          <nav aria-label="Footer" className="lg:col-span-4">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-paper/70">Navigate the chaos</p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-1">
              {links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="group inline-flex items-start gap-2 text-lg font-bold uppercase tracking-wide transition-colors hover:text-sun"
                  >
                    <span
                      className="inline-block text-hot transition-transform group-hover:translate-x-1"
                      aria-hidden
                    >
                      →
                    </span>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-16 grid gap-6 border-t border-paper/15 pt-8 text-sm text-paper/75 md:grid-cols-2">
          <address className="not-italic leading-relaxed">
            Grade Delusion™ is a brand of <span className="font-bold text-paper">{business.legalName}</span>
            {business.uen && <> (UEN {business.uen})</>}, {business.country}.
            {business.address && (
              <>
                <br />
                {business.address}
              </>
            )}
            <br />
            Contact &amp; data protection:{" "}
            <a href={`mailto:${business.dpoEmail}`} className="font-bold text-paper underline underline-offset-2 hover:text-sun">
              {business.dpoEmail}
            </a>
          </address>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 md:justify-end" aria-label="Legal">
            {legalLinks.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="font-bold text-paper underline-offset-4 hover:text-sun hover:underline">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-3 text-sm text-paper/75 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {business.legalName}. Your grades may vary. Your delusion won&apos;t.
          </p>
          <p>All results on this site are jokes. Your actual results are not. 💀</p>
        </div>
      </div>
    </footer>
  );
}
