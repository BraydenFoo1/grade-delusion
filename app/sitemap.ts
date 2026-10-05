import type { MetadataRoute } from "next";
import { legal, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}${legal.privacy}`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site.url}${legal.terms}`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
