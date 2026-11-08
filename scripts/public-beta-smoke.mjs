// End-to-end check of the PUBLIC BETA on a real production build: run `npm run build` first, then `npm run test:public-beta`.
// Starts `next start` with NO database, auth secret, e-mail key or GD_LOCAL, requests the site over HTTP and asserts
// what is open, what is a 404, that no participation controls render, and that the security headers are intact.
import { spawn } from "node:child_process";

const PORT = Number(process.env.PUBLIC_BETA_SMOKE_PORT ?? 3199);
const BASE = `http://localhost:${PORT}`;
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(DATABASE_URL|RESEND_API_KEY|EMAIL_FROM|BETTER_AUTH_.*|AUTH_TRUSTED_ORIGINS|GD_.*|VERCEL.*|NEXT_PUBLIC_SITE_URL)$/.test(k)));
env.NODE_ENV = "production";

const server = spawn("npx", ["next", "start", "-p", String(PORT)], { env, stdio: ["ignore", "pipe", "pipe"] });
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));

const failures = [];
const check = (ok, what) => {
  if (!ok) failures.push(what);
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
};
const get = async (path, init) => {
  const res = await fetch(BASE + path, { redirect: "manual", ...init });
  return { status: res.status, headers: res.headers, text: await res.text() };
};

try {
  for (let i = 0; i < 40; i++) {
    try { await fetch(BASE + "/", { signal: AbortSignal.timeout(1000) }); break; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }

  // open
  for (const p of ["/", "/community", "/community?q=x&category=exams&sort=top", "/api/community/posts", "/student-memes", "/exam-memes", "/privacy", "/terms", "/robots.txt", "/sitemap.xml"]) {
    check((await get(p)).status === 200, `GET ${p} is 200`);
  }
  // closed
  for (const p of ["/sign-in", "/sign-up", "/check-email", "/forgot-password", "/reset-password", "/dashboard", "/submit", "/my-submissions", "/my-submissions/x/edit", "/notifications", "/activity", "/settings", "/admin", "/admin/users", "/admin/queue", "/community/00000000-0000-4000-8000-000000000000", "/u/anyone", "/api/auth/ok", "/api/auth/get-session", "/api/notifications/unread"]) {
    check((await get(p)).status === 404, `GET ${p} is 404`);
  }
  for (const p of ["/api/auth/sign-in/email", "/api/auth/sign-up/email", "/api/auth/delete-user", "/api/auth/request-password-reset", "/api/auth/reset-password"]) {
    const r = await get(p, { method: "POST", headers: { "content-type": "application/json", origin: BASE }, body: "{}" });
    check(r.status === 404, `POST ${p} is 404`);
  }
  // a forged server-action call must not reach anything
  const forged = await get("/community", { method: "POST", headers: { "next-action": "0".repeat(40), "content-type": "text/plain;charset=UTF-8" }, body: "[]" });
  check(forged.status >= 400 || !/"ok":true/.test(forged.text), "a forged server-action POST does nothing");

  // content
  const community = await get("/community");
  check(community.text.includes("Community is opening soon"), "/community shows 'Community is opening soon'");
  for (const bad of ['href="/sign-in', 'href="/sign-up', 'href="/submit', 'href="/dashboard', "Submit yours", "Sign in", ">Join<"]) {
    check(!community.text.includes(bad), `/community has no ${JSON.stringify(bad)}`);
  }
  const feed = await get("/api/community/posts");
  check(feed.text === JSON.stringify({ items: [], total: 0, page: 1, pageCount: 1 }), "feed API is the empty static feed");
  for (const p of ["/privacy", "/terms"]) check(!(await get(p)).text.includes("Public beta."), `${p} does not show the unreviewed beta wording`);

  // security headers still present
  for (const p of ["/", "/community", "/dashboard"]) {
    const h = (await get(p)).headers;
    check(/frame-ancestors 'none'/.test(h.get("content-security-policy") ?? ""), `${p}: CSP frame-ancestors 'none'`);
    check(h.get("x-content-type-options") === "nosniff", `${p}: nosniff`);
    check(h.get("x-frame-options") === "DENY", `${p}: X-Frame-Options DENY`);
    check(!!h.get("referrer-policy"), `${p}: Referrer-Policy`);
  }
  check(/noindex/.test((await get("/dashboard")).headers.get("x-robots-tag") ?? ""), "/dashboard keeps X-Robots-Tag noindex");

  // the server never needed (or tried) a database, auth secret or mail setup
  check(!/DATABASE_URL|BETTER_AUTH|RESEND/.test(log), "the server never complained about database/auth/mail configuration");
  // The only error allowed in the log is Next.js itself rejecting the deliberately forged server-action ID above.
  const errorLines = log.split("\n").filter((l) => /\bError\b/.test(l) && !/Server Reference ID/.test(l));
  check(errorLines.length === 0, `no other errors in the server log${errorLines.length ? `: ${errorLines[0]}` : ""}`);
} finally {
  server.kill("SIGTERM");
}
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:\n- ${failures.join("\n- ")}\n--- server log ---\n${log}`);
  process.exit(1);
}
console.log("\nPublic beta smoke test passed.");
