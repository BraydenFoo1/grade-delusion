"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { submitPostAction, updatePostAction } from "@/app/actions/community";
import { CATEGORIES, LIMITS, type CategoryKey } from "@/lib/platform/constants";
import { Button, Notice, describe } from "../ui";

/** Write a new delusion, or edit one of yours (`edit` set). Both go to the moderators before anyone else sees them. */
export default function PostComposer({ edit }: { edit?: { id: string; body: string; category: CategoryKey; wasLive: boolean } }) {
  const router = useRouter();
  const id = useId();
  const [body, setBody] = useState(edit?.body ?? "");
  const [category, setCategory] = useState<CategoryKey>(edit?.category ?? "life");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<{ body?: string; category?: string }>({});
  const [sent, setSent] = useState(false);
  const left = LIMITS.postMax - body.length;
  const tooShort = body.trim().length < LIMITS.postMin;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFieldError({});
    const res = edit ? await updatePostAction(edit.id, { body, category }) : await submitPostAction({ body, category });
    setBusy(false);
    if (!res.ok) {
      setError(res.error.message);
      setFieldError(res.error.fieldErrors ?? {});
      return;
    }
    if (edit) {
      router.push("/my-submissions?saved=1");
      router.refresh();
      return;
    }
    setSent(true);
    setBody("");
    router.refresh();
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <Notice tone="ok">
          <b>Sent for review.</b> A moderator will read it before it goes live. You&apos;ll get a notification either way.
        </Notice>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setSent(false)}>
            Write another
          </Button>
          <Link href="/my-submissions" className="pf-btn">
            See my submissions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {edit?.wasLive ? (
        <Notice tone="info">This one is live. Saving your changes takes it down until a moderator approves the new version.</Notice>
      ) : null}
      {error && !fieldError.body ? <Notice tone="error">{error}</Notice> : null}

      <div>
        <label htmlFor={`${id}-body`} className="pf-label">
          Your delusion
        </label>
        <textarea
          id={`${id}-body`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={LIMITS.postMax}
          rows={7}
          placeholder="e.g. Everyone else didn't study either, so the teacher can't scold the whole class. Confirm plus chop."
          className="pf-input"
          {...describe(`${id}-body`, fieldError.body, true)}
        />
        <div className="mt-1.5 flex flex-wrap items-start justify-between gap-x-4">
          <p id={`${id}-body-${fieldError.body ? "error" : "hint"}`} className={fieldError.body ? "pf-error-text text-sm font-semibold" : "pf-muted text-sm"}>
            {fieldError.body ?? `${LIMITS.postMin}–${LIMITS.postMax} characters. Text only; no links or contact details.`}
          </p>
          <p className={left < 40 ? "pf-error-text text-sm font-semibold" : "pf-muted text-sm"} aria-live="polite">
            {left} left
          </p>
        </div>
      </div>

      <fieldset>
        <legend className="pf-label">Category</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <label key={c.key} className="pf-chip cursor-pointer has-[:checked]:bg-(--pf-fg) has-[:checked]:text-(--pf-bg) has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--pf-focus)">
              <input type="radio" name={`${id}-category`} value={c.key} checked={category === c.key} onChange={() => setCategory(c.key)} className="sr-only" />
              {c.label}
            </label>
          ))}
        </div>
        {fieldError.category ? <p className="pf-error-text mt-1.5 text-sm font-semibold">{fieldError.category}</p> : null}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={busy} disabled={tooShort}>
          {busy ? "Sending…" : edit ? "Save and resubmit" : "Send for review"}
        </Button>
        <Link href={edit ? "/my-submissions" : "/community"} className="pf-btn pf-btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
