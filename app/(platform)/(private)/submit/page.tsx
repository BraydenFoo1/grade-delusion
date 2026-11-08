import type { Metadata } from "next";
import Link from "next/link";
import PostComposer from "@/components/platform/community/PostComposer";
import { Notice, PageHeader } from "@/components/platform/ui";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { isSuspended } from "@/lib/platform/actor";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Submit a delusion" };

export default async function SubmitPage() {
  const actor = await requireActor("/submit");
  const settings = await getSettings(await getDb());
  const blocked = isSuspended(actor) ? "Your account is suspended, so you can't post right now." : !settings.submissionsOpen ? "New submissions are paused right now. Check back soon." : null;
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Submit a delusion">
        Share the confident thing you told yourself before the exam. A moderator reads every post before it goes live.
      </PageHeader>
      {blocked ? (
        <Notice tone="info">{blocked}</Notice>
      ) : (
        <div className="pf-card pf-lift p-5 sm:p-7">
          <PostComposer />
        </div>
      )}
      <section aria-labelledby="rules" className="pf-panel space-y-2 p-5 text-[0.9375rem]">
        <h2 id="rules" className="font-bold">
          What gets approved
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Funny, relatable and kind. Laugh with students, not at them.</li>
          <li>No names of real people, schools or teachers, no phone numbers, no links.</li>
          <li>Nothing hateful, sexual or harmful, and nothing that encourages cheating.</li>
        </ul>
        <p className="pf-muted">
          Read the full{" "}
          <Link href="/terms#community" className="pf-link">
            community rules
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
