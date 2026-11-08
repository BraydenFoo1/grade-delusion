import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthCard from "@/components/platform/auth/AuthCard";
import { SignInForm } from "@/components/platform/auth/AuthForms";
import { getActor } from "@/lib/auth/session";
import { safeNext } from "@/lib/platform/redirect";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; notice?: string }> }) {
  const { next, notice } = await searchParams;
  if (await getActor()) redirect(safeNext(next));
  const known = notice === "reset" || notice === "verified" || notice === "deleted" ? notice : undefined;
  return (
    <AuthCard
      title="Welcome back"
      intro="Sign in to post delusions, join the comments and see how your submissions are doing."
      footer={
        <>
          New here?{" "}
          <Link href="/sign-up" className="pf-link">
            Create an account
          </Link>
        </>
      }
    >
      <SignInForm next={next} notice={known} />
    </AuthCard>
  );
}
