import type { Metadata } from "next";
import { SettingsForm } from "@/components/platform/admin/AdminActions";
import { PageHeader } from "@/components/platform/ui";
import { adminPage } from "@/lib/auth/admin-page";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Platform settings" };

export default async function AdminSettingsPage() {
  const { db } = await adminPage("/admin/settings");
  const settings = await getSettings(db);
  return (
    <>
      <PageHeader title="Platform settings">Switches, limits and word filters. Every change is recorded in the audit log.</PageHeader>
      <div className="pf-card p-5 sm:p-7">
        <SettingsForm initial={settings} />
      </div>
    </>
  );
}
