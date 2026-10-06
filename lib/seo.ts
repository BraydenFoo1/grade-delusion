import type { Metadata } from "next";
import { homeUrl, site } from "./site";

// The site-wide share image (app/opengraph-image.tsx). Page-level openGraph/twitter objects replace the
// inherited ones, so the image has to be listed again or inner pages lose their preview picture.
export const shareImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: `${site.name} — ${site.tagline}`,
};

// Google shows roughly 60 characters of a title; past that, drop the brand suffix rather than get cut off.
const MAX_TITLE_LENGTH = 60;

export function pageTitle(title: string) {
  const withBrand = `${title} · ${site.name}`;
  return withBrand.length <= MAX_TITLE_LENGTH ? withBrand : title;
}

export const absoluteUrl = (path: string) => (path === "/" ? homeUrl : `${site.url}${path}`);

/** Metadata for an inner page: its own title, canonical URL and link-preview tags
 *  (page-level openGraph/twitter replace the home page's instead of inheriting them). */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  publishedTime,
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  publishedTime?: string;
}): Metadata {
  const fullTitle = pageTitle(title);
  const url = absoluteUrl(path);
  const shared = { url, siteName: site.name, title: fullTitle, description, locale: "en_SG", images: [shareImage] };
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    openGraph:
      type === "article"
        ? { ...shared, type: "article", publishedTime, modifiedTime: publishedTime }
        : { ...shared, type: "website" },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [shareImage] },
  };
}

// ---------- Structured data ----------

const brand = { "@type": "Organization", "@id": `${homeUrl}#organization`, name: site.name, url: homeUrl };

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function articleJsonLd({
  title,
  description,
  path,
  datePublished,
}: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
}) {
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: [`${site.url}${shareImage.url}`],
    datePublished,
    dateModified: datePublished,
    author: brand,
    publisher: brand,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    inLanguage: "en-SG",
  };
}
