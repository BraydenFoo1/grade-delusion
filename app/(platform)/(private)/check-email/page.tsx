import type { Metadata } from "next";
import Link from "next/link";
import AuthCard from "@/components/platform/auth/AuthCard";
import { Notice } from "@/components/platform/ui";
import { isProduction, resendApiKey } from "@/lib/env";

export const metadata: Metadata = { title: "Check your e-mail" };

export default function CheckEmailPage() {
  // Without an e-mail provider (local development) messages are written to a folder instead.
  const devOutbox = !isProduction() && !resendApiKey();
  return (
    <AuthCard
      title="Check your e-mail"
      intro="We sent a confirmation link. Open it and you'll be signed in, ready to post."
      footer={
        <Link href="/sign-in" className="pf-link">
          Already confirmed? Sign in
        </Link>
      }
    >
      <div className="space-y-4">
        <ul className="list-disc space-y-2 pl-5 text-[0.9375rem]">
          <li>The link works for 24 hours.</li>
          <li>Nothing yet? Look in spam or promotions.</li>
          <li>Still nothing? Try signing in. We&apos;ll send a fresh link.</li>
        </ul>
        {devOutbox ? (
          <Notice tone="info">
            <b>Development mode:</b> no e-mail service is connected, so the message was saved to <code>.data/outbox/</code>. Open the newest file and follow the link inside.
          </Notice>
        ) : null}
      </div>
    </AuthCard>
  );
}
