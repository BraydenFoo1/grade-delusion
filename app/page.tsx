import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import WhatIs from "@/components/WhatIs";
import DelusionLevels from "@/components/DelusionLevels";
import DelusionFeed from "@/components/DelusionFeed";
import DelusionGenerator from "@/components/DelusionGenerator";
import DelusionTest from "@/components/DelusionTest";
import GradeSolution from "@/components/GradeSolution";
import JoinSocials from "@/components/JoinSocials";
import Footer from "@/components/Footer";
import EggProvider from "@/components/eggs/EggProvider";
import { homeUrl, site } from "@/lib/site";

// WebSite is Google's main site-name signal; it must live on the home page and use the canonical URL.
const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${homeUrl}#website`,
    name: site.name,
    alternateName: [site.alternateName],
    url: homeUrl,
    publisher: { "@id": `${homeUrl}#organization` },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${homeUrl}#organization`,
    name: site.name,
    alternateName: site.alternateName,
    url: homeUrl,
    slogan: site.tagline,
    parentOrganization: { "@type": "Organization", name: "Grade Solution", url: site.gradeSolutionUrl },
    sameAs: Object.values(site.socials),
  },
];

export default function Home() {
  return (
    <EggProvider>
      <link rel="canonical" href={homeUrl} />
      <meta property="og:url" content={homeUrl} />
      <a
        href="#main"
        className="sr-only z-[100] rounded-lg bg-ink px-4 py-2 font-bold text-sun focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <Marquee />
        <WhatIs />
        <DelusionLevels />
        <DelusionFeed />
        <DelusionGenerator />
        <DelusionTest />
        <GradeSolution />
        <JoinSocials />
      </main>
      <Footer />
      {structuredData.map((data) => (
        <script
          key={data["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </EggProvider>
  );
}
