import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthCard from "@/components/platform/auth/AuthCard";
import { SignUpForm } from "@/components/platform/auth/AuthForms";
import { Notice } from "@/components/platform/ui";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Join" };

export default async function SignUpPage() {
  if (await getActor()) redirect("/dashboard");
  const settings = await getSettings(await getDb());
  return (
    <AuthCard
      title="Join the delusion"
      intro="Post your delusions, react to everyone else's and keep a record of your most confident mistakes."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="pf-link">
            Sign in
          </Link>
        </>
      }
    >
      {settings.registrationOpen ? (
        <SignUpForm />
      ) : (
        <Notice tone="info">
          <b>Sign-ups are paused right now.</b> Check back soon. You can still read everything in the community.
        </Notice>
      )}
    </AuthCard>
  );
}
