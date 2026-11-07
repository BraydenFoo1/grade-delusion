"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  moderateCommentAction,
  moderatePostAction,
  resolveReportAction,
  restoreUserAction,
  setRoleAction,
  suspendUserAction,
  updateSettingsAction,
} from "@/app/actions/admin";
import { LIMITS, ROLES, type Role } from "@/lib/platform/constants";
import type { Settings } from "@/lib/platform/validation";
import Icon from "../Icon";
import { Button, Field, Notice } from "../ui";

const QUICK_REASONS = ["Off-topic", "Shares personal information", "Unkind or targets someone", "Looks like spam", "Please rewrite it"];

/**
 * After a decision, keep the confirmation on screen for a moment and only then refresh the list (which drops
 * the decided item). Without the pause a moderator working through a queue gets no feedback at all.
 */
function useDelayedRefresh(ms = 1600) {
  const router = useRouter();
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => router.refresh(), ms);
  };
}

/** A note field with one-tap reasons. Notes are shown to the author, so they should be kind and specific. */
function NoteField({ value, onChange, label = "Note to the author (optional)", reasons = true }: { value: string; onChange: (v: string) => void; label?: string; reasons?: boolean }) {
  const id = useId();
  return (
    <div className="space-y-2">
      {reasons ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick reasons">
          {QUICK_REASONS.map((r) => (
            <button key={r} type="button" className="pf-chip !min-h-8 !py-0 text-[0.8125rem]" aria-pressed={value === r} onClick={() => onChange(value === r ? "" : r)}>
              {r}
            </button>
          ))}
        </div>
      ) : null}
      <Field label={label} htmlFor={id}>
        <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} maxLength={LIMITS.moderationNoteMax} rows={2} className="pf-input !min-h-0" />
      </Field>
    </div>
  );
}

/** The review desk: one pending post, two decisions. Rejecting asks for an optional note first. */
export function ReviewControls({ postId, version, ownPost, isAdmin }: { postId: string; version?: string; ownPost: boolean; isAdmin: boolean }) {
  const refreshSoon = useDelayedRefresh();
  const [mode, setMode] = useState<"idle" | "rejecting">("idle");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  if (ownPost && !isAdmin) return <Notice tone="info">This is your own post. Another moderator needs to review it.</Notice>;
  if (done) return <Notice tone="ok">{done}</Notice>;

  async function decide(decision: "approve" | "reject") {
    setBusy(decision);
    setError("");
    const res = await moderatePostAction({ id: postId, decision, note, version });
    setBusy(null);
    if (!res.ok) return setError(res.error.message);
    setDone(decision === "approve" ? "Approved. It's live now." : "Rejected. The author has been told.");
    refreshSoon();
  }

  return (
    <div className="space-y-3">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {mode === "rejecting" ? (
        <div className="pf-panel space-y-3 p-4">
          <NoteField value={note} onChange={setNote} />
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" loading={busy === "reject"} onClick={() => decide("reject")}>
              <Icon name="x" size={18} /> Reject
            </Button>
            <Button variant="ghost" onClick={() => setMode("idle")}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="ok" loading={busy === "approve"} onClick={() => decide("approve")}>
            <Icon name="check" size={18} /> Approve
          </Button>
          <Button onClick={() => setMode("rejecting")}>
            <Icon name="x" size={18} /> Not approved…
          </Button>
        </div>
      )}
    </div>
  );
}

/** Row actions on the posts page: remove a live post, restore a removed one, or approve a rejected one. */
export function PostStaffActions({ postId, version, status, ownPost, isAdmin }: { postId: string; version?: string; status: string; ownPost: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (ownPost && !isAdmin) return <span className="pf-muted text-sm">Your post</span>;

  async function run(decision: "remove" | "restore" | "approve") {
    setBusy(true);
    setError("");
    const res = await moderatePostAction({ id: postId, decision, note, version });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setOpen(false);
    setNote("");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {status === "approved" ? (
          <Button small variant="ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <Icon name="trash" size={16} /> Remove
          </Button>
        ) : null}
        {status === "removed" ? (
          <Button small loading={busy} onClick={() => run("restore")}>
            Restore
          </Button>
        ) : null}
        {status === "rejected" ? (
          <Button small variant="ok" loading={busy} onClick={() => run("approve")}>
            Approve
          </Button>
        ) : null}
      </div>
      {open ? (
        <div className="pf-panel space-y-3 p-3">
          <NoteField value={note} onChange={setNote} />
          <div className="flex gap-2">
            <Button small variant="danger" loading={busy} onClick={() => run("remove")}>
              Remove post
            </Button>
            <Button small variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <p role="alert" className="pf-error-text text-sm font-semibold">{error}</p> : null}
    </div>
  );
}

export function CommentStaffActions({ commentId, status, ownComment, isAdmin }: { commentId: string; status: string; ownComment: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (ownComment && !isAdmin) return <span className="pf-muted text-sm">Your comment</span>;

  async function run(decision: "remove" | "restore") {
    setBusy(true);
    setError("");
    const res = await moderateCommentAction({ id: commentId, decision, note });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setOpen(false);
    router.refresh();
  }
  return (
    <div className="space-y-2">
      {status === "visible" ? (
        <Button small variant="ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <Icon name="trash" size={16} /> Remove
        </Button>
      ) : (
        <Button small loading={busy} onClick={() => run("restore")}>
          Restore
        </Button>
      )}
      {open ? (
        <div className="pf-panel space-y-3 p-3">
          <NoteField value={note} onChange={setNote} reasons={false} />
          <div className="flex gap-2">
            <Button small variant="danger" loading={busy} onClick={() => run("remove")}>
              Remove comment
            </Button>
            <Button small variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <p role="alert" className="pf-error-text text-sm font-semibold">{error}</p> : null}
    </div>
  );
}

/** Resolve a report (and every other open report on the same content in one go). */
export function ReportControls({ reportId, targetStatus, ownContent, isAdmin }: { reportId: string; targetStatus: string; ownContent: boolean; isAdmin: boolean }) {
  const refreshSoon = useDelayedRefresh();
  const [mode, setMode] = useState<"idle" | "removing">("idle");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (ownContent && !isAdmin) return <Notice tone="info">This report is about your own content. Another moderator needs to handle it.</Notice>;
  if (done) return <Notice tone="ok">Report closed.</Notice>;

  async function run(resolution: "dismiss" | "no_action" | "remove_content") {
    setBusy(resolution);
    setError("");
    const res = await resolveReportAction({ id: reportId, resolution, note });
    setBusy(null);
    if (!res.ok) return setError(res.error.message);
    setDone(true);
    refreshSoon();
  }
  const alreadyGone = targetStatus === "removed";

  return (
    <div className="space-y-3">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {mode === "removing" ? (
        <div className="pf-panel space-y-3 p-4">
          <NoteField value={note} onChange={setNote} />
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" loading={busy === "remove_content"} onClick={() => run("remove_content")}>
              <Icon name="trash" size={18} /> Remove it
            </Button>
            <Button variant="ghost" onClick={() => setMode("idle")}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!alreadyGone ? (
            <Button variant="danger" onClick={() => setMode("removing")}>
              <Icon name="trash" size={18} /> Remove content…
            </Button>
          ) : null}
          <Button loading={busy === "no_action"} onClick={() => run("no_action")}>
            Reviewed, no action
          </Button>
          <Button variant="ghost" loading={busy === "dismiss"} onClick={() => run("dismiss")}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

/** Suspend, ban or restore one user. Moderators can act on members; admins also on moderators. */
export function UserModerationPanel({ userId, suspended, canAct }: { userId: string; suspended: boolean; canAct: boolean }) {
  const router = useRouter();
  const id = useId();
  const [mode, setMode] = useState<"suspend" | "ban">("suspend");
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});

  if (!canAct) return <Notice tone="info">You don&apos;t have permission to moderate this account.</Notice>;

  async function restore() {
    setBusy(true);
    setError("");
    const res = await restoreUserAction(userId);
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    router.refresh();
  }

  async function suspend() {
    setBusy(true);
    setError("");
    setFields({});
    const res = await suspendUserAction({ userId, mode, days: mode === "suspend" ? Number(days) : undefined, reason });
    setBusy(false);
    if (!res.ok) {
      setError(res.error.message);
      setFields(res.error.fieldErrors ?? {});
      return;
    }
    setReason("");
    router.refresh();
  }

  if (suspended) {
    return (
      <div className="space-y-3">
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button variant="ok" loading={busy} onClick={restore}>
          Restore this account
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {error && !fields.reason ? <Notice tone="error">{error}</Notice> : null}
      <fieldset>
        <legend className="pf-label">Action</legend>
        <div className="flex flex-wrap gap-2">
          {(["suspend", "ban"] as const).map((m) => (
            <label key={m} className="pf-chip cursor-pointer has-[:checked]:bg-(--pf-fg) has-[:checked]:text-(--pf-bg) has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--pf-focus)">
              <input type="radio" name={`${id}-mode`} className="sr-only" checked={mode === m} onChange={() => setMode(m)} />
              {m === "suspend" ? "Suspend for a while" : "Ban permanently"}
            </label>
          ))}
        </div>
      </fieldset>
      {mode === "suspend" ? (
        <Field label="For how long" htmlFor={`${id}-days`}>
          <select id={`${id}-days`} value={days} onChange={(e) => setDays(e.target.value)} className="pf-input max-w-48">
            {[1, 3, 7, 14, 30, 90].map((d) => (
              <option key={d} value={d}>
                {d} {d === 1 ? "day" : "days"}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field label="Reason (the user is told)" htmlFor={`${id}-reason`} error={fields.reason}>
        <textarea id={`${id}-reason`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} rows={2} className="pf-input !min-h-0" aria-invalid={fields.reason ? true : undefined} />
      </Field>
      <Button variant="danger" loading={busy} onClick={suspend} disabled={reason.trim().length < 3}>
        {mode === "ban" ? "Ban account" : "Suspend account"}
      </Button>
    </div>
  );
}

export function RoleForm({ userId, role, canChange }: { userId: string; role: Role; canChange: boolean }) {
  const router = useRouter();
  const id = useId();
  const [next, setNext] = useState<Role>(role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  if (!canChange) return <p className="pf-muted text-sm">Only admins can change roles.</p>;

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    const res = await setRoleAction({ userId, role: next });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setSaved(true);
    router.refresh();
  }
  return (
    <div className="space-y-3">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {saved ? <Notice tone="ok">Role updated.</Notice> : null}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Role" htmlFor={`${id}-role`}>
          <select id={`${id}-role`} value={next} onChange={(e) => setNext(e.target.value as Role)} className="pf-input min-w-44 capitalize">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Button variant="primary" loading={busy} disabled={next === role} onClick={save}>
          Save role
        </Button>
      </div>
      <p className="pf-muted text-sm">Moderators can review posts, handle reports and suspend members. Admins can also change roles, read the audit log and edit settings.</p>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-5 shrink-0 accent-(--hot)" />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="pf-muted block text-sm">{hint}</span>
      </span>
    </label>
  );
}

/** Platform configuration (admin only). The merged result is validated again on the server. */
export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const id = useId();
  const [s, setS] = useState({ ...initial, blockedTerms: initial.blockedTerms.join("\n") });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((p) => ({ ...p, [k]: v }));
  const num = (k: "dailyPostLimit" | "dailyCommentLimit" | "dailyReportLimit" | "postCooldownSec" | "commentCooldownSec", label: string, hint: string): ReactNode => (
    <Field label={label} htmlFor={`${id}-${k}`} hint={hint}>
      <input id={`${id}-${k}`} type="number" min={0} value={s[k]} onChange={(e) => set(k, Number(e.target.value))} className="pf-input max-w-40" />
    </Field>
  );

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    const res = await updateSettingsAction({
      ...s,
      blockedTerms: s.blockedTerms.split("\n").map((t) => t.trim()).filter(Boolean),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {saved ? <Notice tone="ok">Settings saved.</Notice> : null}

      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-bold">Switches</legend>
        <Toggle label="Sign-ups open" hint="Turn off to stop new accounts (existing members are unaffected)." checked={s.registrationOpen} onChange={(v) => set("registrationOpen", v)} />
        <Toggle label="Submissions open" hint="Turn off to pause new delusions, for example during a moderation backlog." checked={s.submissionsOpen} onChange={(v) => set("submissionsOpen", v)} />
        <Toggle label="Comments open" hint="Turn off to pause new comments and replies." checked={s.commentsOpen} onChange={(v) => set("commentsOpen", v)} />
        <Toggle label="Allow links in posts and comments" hint="Off is safest: links and e-mail addresses are rejected as spam." checked={s.allowLinks} onChange={(v) => set("allowLinks", v)} />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-bold">Limits</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          {num("dailyPostLimit", "Posts per member per day", "1 to 50")}
          {num("postCooldownSec", "Seconds between posts", "0 turns the cooldown off")}
          {num("dailyCommentLimit", "Comments per member per day", "1 to 500")}
          {num("commentCooldownSec", "Seconds between comments", "0 turns the cooldown off")}
          {num("dailyReportLimit", "Reports per member per day", "1 to 100")}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-bold">Content</legend>
        <Field label="Blocked words and phrases" htmlFor={`${id}-terms`} hint="One per line. Posts, comments and display names containing these are rejected. Matching ignores case and common letter swaps.">
          <textarea id={`${id}-terms`} value={s.blockedTerms} onChange={(e) => set("blockedTerms", e.target.value)} rows={5} className="pf-input" spellCheck={false} />
        </Field>
        <Field label="Site announcement" htmlFor={`${id}-ann`} hint="Shown as a banner above every community page. Leave empty for none.">
          <input id={`${id}-ann`} value={s.announcement} onChange={(e) => set("announcement", e.target.value)} maxLength={160} className="pf-input" />
        </Field>
      </fieldset>

      <Button variant="primary" loading={busy} onClick={save}>
        Save settings
      </Button>
    </div>
  );
}
