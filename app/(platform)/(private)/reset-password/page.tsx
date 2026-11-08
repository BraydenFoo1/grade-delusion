import type { Metadata } from "next";
import AuthCard from "@/components/platform/auth/AuthCard";
import { ResetPasswordForm } from "@/components/platform/auth/AuthForms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return (
    <AuthCard title="Choose a new password">
      <ResetPasswordForm token={token} invalid={Boolean(error)} />
    </AuthCard>
  );
}
