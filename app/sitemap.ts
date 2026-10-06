import type { MetadataRoute } from "next";
import { PUBLISHED, articles, pages } from "@/lib/content";
import { absoluteUrl } from "@/lib/seo";
import { legal } from "@/lib/site";

// Every URL here is built with absoluteUrl(), the same function that builds each page's canonical.
export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    ...Object.values(pages).map((p) => ({
      url: absoluteUrl(p.path),
      lastModified: PUBLISHED,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...articles.map((a) => ({
      url: absoluteUrl(a.path),
      lastModified: PUBLISHED,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
    { url: absoluteUrl(legal.privacy), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl(legal.terms), changeFrequency: "yearly", priority: 0.3 },
  ];
  // /exam-delusions is both a discovery page and an article: list each URL once.
  const seen = new Set<string>();
  return entries.filter((e) => !seen.has(e.url) && seen.add(e.url));
}
