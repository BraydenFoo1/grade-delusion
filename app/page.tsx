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
import { site } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: site.url,
  slogan: site.tagline,
  parentOrganization: { "@type": "Organization", name: "Grade Solution", url: site.gradeSolutionUrl },
  sameAs: Object.values(site.socials),
};

export default function Home() {
  return (
    <EggProvider>
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </EggProvider>
  );
}
