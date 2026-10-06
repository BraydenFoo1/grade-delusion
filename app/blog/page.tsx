import type { Metadata } from "next";
import ContentShell from "@/components/content/ContentShell";
import { ArticleCard } from "@/components/content/Blocks";
import Reveal from "@/components/ui/Reveal";
import { PUBLISHED, articles, pages } from "@/lib/content";
import { absoluteUrl, pageMetadata } from "@/lib/seo";
import { homeUrl, site } from "@/lib/site";

const page = pages.blog;

export const metadata: Metadata = pageMetadata(page);

const blogJsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: `The ${site.name} Blog`,
  description: page.description,
  url: absoluteUrl(page.path),
  publisher: { "@type": "Organization", "@id": `${homeUrl}#organization`, name: site.name, url: homeUrl },
  blogPost: articles.map((a) => ({
    "@type": "BlogPosting",
    headline: a.title,
    url: absoluteUrl(a.path),
    datePublished: PUBLISHED,
  })),
};

export default function BlogPage() {
  return (
    <ContentShell
      accent="volt"
      eyebrow="Long-form delusion"
      title={
        <>
          The <span className="brush">delusion</span> blog
        </>
      }
      intro={
        <>
          Funny articles about exams, studying, procrastination and student life. Peer-reviewed by absolutely nobody.
          Shorter attention span? Try the <a href={pages.studentMemes.path}>student memes</a> instead.
        </>
      }
      note="(reading articles about studying is basically studying.)"
      crumbs={[{ name: page.label, path: page.path }]}
      related={[pages.studentMemes, pages.examMemes, pages.quotes]}
      jsonLd={[blogJsonLd]}
    >
      <section aria-labelledby="articles-title" className="dots mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 id="articles-title" className="font-display text-[clamp(2rem,5vw,3.25rem)] uppercase leading-none">
          Latest articles
        </h2>
        <ul className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a, i) => (
            <li key={a.path}>
              <Reveal delay={(i % 3) * 100} className="h-full">
                <ArticleCard article={a} index={i} />
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
    </ContentShell>
  );
}
