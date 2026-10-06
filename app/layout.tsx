import type { Metadata, Viewport } from "next";
import { Anton, Caveat, Permanent_Marker, Space_Grotesk } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--nf-anton", display: "swap" });
const marker = Permanent_Marker({ weight: "400", subsets: ["latin"], variable: "--nf-marker", display: "swap" });
const caveat = Caveat({ weight: ["600", "700"], subsets: ["latin"], variable: "--nf-caveat", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--nf-grotesk", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  keywords: [
    "student memes",
    "exam memes",
    "study humour",
    "Grade Delusion",
    "Grade Solution",
    "delusion test",
    "student life",
  ],
  applicationName: site.name,
  // Home canonical + og:url are rendered in app/page.tsx: Next strips the trailing slash from
  // the root URL, and the canonical must match the WebSite structured data exactly.
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: "100% confidence. 0% evidence. Memes, mini-games and a delusion test for every student.",
    locale: "en_SG",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: "100% confidence. 0% evidence.",
  },
  robots: { index: true, follow: true },
  // Google Search Console ownership check
  verification: { google: "q13y0ZZIKCU2SJeS9nFhPCyXBg1kw4aqyFTnWFzmZrY" },
};

export const viewport: Viewport = {
  themeColor: "#ffe11a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${marker.variable} ${caveat.variable} ${grotesk.variable}`}
    >
      <head>
        <noscript>
          <style>{`.reveal{opacity:1!important;translate:none!important}.reveal .hl{background-size:100% 42%!important}.reveal .write{clip-path:none!important}.reveal .draw path{stroke-dashoffset:0!important}.reveal .brush::before{transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
