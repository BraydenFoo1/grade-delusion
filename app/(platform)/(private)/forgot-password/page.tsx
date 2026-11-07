import type { Metadata } from "next";
import Link from "next/link";
import AuthCard from "@/components/platform/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/platform/auth/AuthForms";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      intro="Enter the e-mail you signed up with and we'll send you a link to choose a new password."
      footer={
        <Link href="/sign-in" className="pf-link">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
