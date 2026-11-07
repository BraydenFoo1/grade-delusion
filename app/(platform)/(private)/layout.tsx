import type { Metadata } from "next";
import type { ReactNode } from "react";

// Everything in this group is personal or administrative: keep it out of search results.
// (next.config.ts also sends an X-Robots-Tag header for the same paths, as a second layer.)
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return children;
}
