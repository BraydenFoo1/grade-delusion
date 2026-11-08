import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
// A production build served over plain http on this machine (GD_LOCAL=1, see lib/env.ts): HSTS and
// "upgrade-insecure-requests" would only get in the way there. Never true on Vercel.
const localHttp = process.env.GD_LOCAL === "1" && !process.env.VERCEL;
const strictTransport = !dev && !localHttp;

// Content-Security-Policy. Scripts need 'unsafe-inline' because Next.js inlines its hydration data and the
// site embeds JSON-LD; a nonce-based policy would force every page (including the static marketing pages)
// to render dynamically. The rest is strict: same-origin only, no framing, no plugins, forms post to us.
// User-written text is only ever rendered by React as text, never as HTML.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(strictTransport ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(strictTransport ? [{ key: "Strict-Transport-Security", value: "max-age=63072000" }] : []),
];

// Personal and administrative areas: never indexed (the pages also set a robots meta tag).
const privatePaths = [
  "/admin/:path*",
  "/dashboard",
  "/submit",
  "/my-submissions/:path*",
  "/notifications",
  "/activity",
  "/settings",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/check-email",
  "/api/:path*",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // PGlite (local development database) ships WebAssembly; keep it out of the bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      ...privatePaths.map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] })),
    ];
  },
};

export default nextConfig;
