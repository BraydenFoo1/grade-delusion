import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeleteAccountForm, PasswordForm, ProfileForm, SessionsPanel } from "@/components/platform/account/SettingsForms";
import { PageHeader } from "@/components/platform/ui";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { formatDate } from "@/lib/platform/format";
import { getOwnAccount } from "@/lib/services/users";

export const metadata: Metadata = { title: "Settings" };

function Section({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${title}-h`} className="pf-card p-5 sm:p-7">
      <h2 id={`${title}-h`} className="text-xl font-bold">
        {title}
      </h2>
      {intro ? <p className="pf-muted mt-1 max-w-[56ch]">{intro}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const actor = await requireActor("/settings");
  const account = await getOwnAccount(await getDb(), actor.id);
  if (!account) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Settings">Your profile, password and devices.</PageHeader>
      <Section title="Profile" intro="This is what other students see next to your posts.">
        <ProfileForm name={account.name} bio={account.bio ?? ""} />
      </Section>
      <Section title="Account">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
          <dt className="pf-muted">E-mail</dt>
          <dd className="font-semibold [overflow-wrap:anywhere]">{account.email}</dd>
          <dt className="pf-muted">Role</dt>
          <dd className="font-semibold capitalize">{actor.role}</dd>
          <dt className="pf-muted">Member since</dt>
          <dd className="font-semibold">{formatDate(account.createdAt)}</dd>
        </dl>
        <p className="pf-muted mt-4 text-sm">Only you can see your e-mail address. To change it, contact the Grade Delusion team.</p>
      </Section>
      <Section title="Password" intro="Changing it signs you out everywhere else.">
        <PasswordForm />
      </Section>
      <Section title="Signed-in devices" intro="Lost a phone or used a shared computer? Sign out everywhere else.">
        <SessionsPanel />
      </Section>
      <Section title="Delete account" intro="Permanently removes your account and everything you posted.">
        <DeleteAccountForm />
      </Section>
    </div>
  );
}
