import type { Metadata } from "next";
import { site } from "./site";

/** Metadata for an inner page: its own title, canonical URL and link-preview tags
 *  (page-level openGraph/twitter replace the home page's instead of inheriting them). */
// The site-wide share image (app/opengraph-image.tsx). Page-level openGraph/twitter objects replace the
// inherited ones, so the image has to be listed again or inner pages lose their preview picture.
const shareImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: `${site.name} — ${site.tagline}`,
};

export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const fullTitle = `${title} · ${site.name}`;
  const url = `${site.url}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, siteName: site.name, title: fullTitle, description, locale: "en_SG", images: [shareImage] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [shareImage] },
  };
}
