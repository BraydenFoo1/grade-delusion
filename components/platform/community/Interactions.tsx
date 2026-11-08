"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { addCommentAction, deleteCommentAction, reactAction, reportAction } from "@/app/actions/community";
import { LIMITS, REACTIONS, REPORT_REASONS, type ReactionKey, type ReportReason } from "@/lib/platform/constants";
import Icon from "../Icon";
import { Button, Field, Notice, describe } from "../ui";

type Counts = Record<ReactionKey, number>;

/** One reaction per person. Updates instantly and rolls back with a message if the server says no. */
export function ReactionBar({
  postId,
  counts,
  mine,
  canReact,
  signInHref,
}: {
  postId: string;
  counts: Counts;
  mine: ReactionKey | null;
  canReact: boolean;
  signInHref: string;
}) {
  const [state, setState] = useState({ counts, mine });
  const [, start] = useTransition();
  const [error, setError] = useState("");

  function choose(kind: ReactionKey) {
    const next = state.mine === kind ? null : kind;
    const before = state;
    const after = { ...state.counts };
    if (state.mine) after[state.mine] -= 1;
    if (next) after[next] += 1;
    setState({ counts: after, mine: next });
    setError("");
    start(async () => {
      const res = await reactAction({ postId, kind: next });
      if (res.ok) setState({ counts: res.data.counts, mine: res.data.mine });
      else {
        setState(before);
        setError(res.error.message);
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Reactions">
        {REACTIONS.map((r) => {
          const n = state.counts[r.key];
          const label = `${r.label}, ${n} ${n === 1 ? "reaction" : "reactions"}`;
          return canReact ? (
            <button
              key={r.key}
              type="button"
              className="pf-chip"
              aria-pressed={state.mine === r.key}
              aria-label={label}
              onClick={() => choose(r.key)}
            >
              <span aria-hidden>{r.emoji}</span>
              <span>{n}</span>
            </button>
          ) : (
            <span key={r.key} className="pf-chip" aria-label={label}>
              <span aria-hidden>{r.emoji}</span>
              <span>{n}</span>
            </span>
          );
        })}
        {!canReact ? (
          <Link href={signInHref} className="pf-link ml-1 text-sm">
            Sign in to react
          </Link>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="pf-error-text mt-2 text-sm font-semibold">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Inline report form (no modal): reason, optional note, one click to send. */
export function ReportButton({
  targetType,
  targetId,
  canReport,
  signInHref,
  label = "Report",
}: {
  targetType: "post" | "comment";
  targetId: string;
  canReport: boolean;
  signInHref: string;
  label?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!canReport) {
    return (
      <Link href={signInHref} className="pf-btn pf-btn-ghost pf-btn-sm">
        <Icon name="flag" size={16} /> {label}
      </Link>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!reason) return setError("Pick a reason so we know what to look for.");
    setBusy(true);
    setError("");
    const res = await reportAction({ targetType, targetId, reason, note });
    setBusy(false);
    if (res.ok) setDone(true);
    else setError(res.error.message);
  }

  return (
    <div className="inline-block">
      <button
        type="button"
        className="pf-btn pf-btn-ghost pf-btn-sm"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((o) => !o)}
        disabled={done}
      >
        <Icon name="flag" size={16} /> {done ? "Reported" : label}
      </button>
      {open && !done ? (
        <form id={`${id}-panel`} onSubmit={submit} className="pf-panel mt-2 w-[min(100%,26rem)] space-y-3 p-4">
          <fieldset>
            <legend className="pf-label">What&apos;s wrong with this?</legend>
            <div className="space-y-1">
              {REPORT_REASONS.map((r) => (
                <label key={r.key} className="flex min-h-9 items-center gap-2.5 text-[0.9375rem]">
                  <input type="radio" name={`${id}-reason`} value={r.key} checked={reason === r.key} onChange={() => setReason(r.key)} className="size-4 accent-(--hot)" />
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Anything else? (optional)" htmlFor={`${id}-note`}>
            <textarea
              id={`${id}-note`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={LIMITS.reportNoteMax}
              rows={2}
              className="pf-input !min-h-0"
            />
          </Field>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <div className="flex gap-2">
            <Button type="submit" variant="danger" small loading={busy}>
              Send report
            </Button>
            <Button small variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
      {done ? (
        <p role="status" className="pf-muted mt-1 text-sm">
          Thanks. A moderator will take a look.
        </p>
      ) : null}
    </div>
  );
}

export function CommentForm({
  postId,
  parentId,
  onDone,
  autoFocus,
  placeholder = "Add a comment…",
}: {
  postId: string;
  parentId?: string;
  onDone?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const left = LIMITS.commentMax - body.length;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await addCommentAction({ postId, parentId, body });
    setBusy(false);
    if (!res.ok) return setError(res.error.fieldErrors?.body ?? res.error.message);
    setBody("");
    onDone?.();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor={id} className="sr-only">
        {parentId ? "Write a reply" : "Write a comment"}
      </label>
      <textarea
        id={id}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={LIMITS.commentMax}
        rows={parentId ? 2 : 3}
        required
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="pf-input"
        {...describe(id, error)}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="pf-error-text text-sm font-semibold">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <span className={left < 30 ? "pf-error-text text-sm font-semibold" : "pf-muted text-sm"} aria-live="polite">
          {left} left
        </span>
        <div className="flex gap-2">
          {onDone ? (
            <Button small variant="ghost" onClick={onDone}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" small variant="primary" loading={busy} disabled={!body.trim()}>
            {parentId ? "Reply" : "Comment"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** Reply / delete (own) / report, for one comment. */
export function CommentControls({
  postId,
  commentId,
  canReply,
  isOwn,
  canReport,
  signInHref,
  topLevel,
}: {
  postId: string;
  commentId: string;
  canReply: boolean;
  isOwn: boolean;
  canReport: boolean;
  signInHref: string;
  topLevel: boolean;
}) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    const res = await deleteCommentAction(commentId);
    setBusy(false);
    if (!res.ok) {
      setError(res.error.message);
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-1">
        {topLevel && canReply ? (
          <button type="button" className="pf-btn pf-btn-ghost pf-btn-sm" aria-expanded={replying} onClick={() => setReplying((r) => !r)}>
            <Icon name="chat" size={16} /> Reply
          </button>
        ) : null}
        {isOwn ? (
          confirming ? (
            <span className="inline-flex items-center gap-1" role="group" aria-label="Confirm delete">
              <span className="pf-muted px-1 text-sm">Delete this comment?</span>
              <Button small variant="danger" loading={busy} onClick={remove}>
                Delete
              </Button>
              <Button small variant="ghost" onClick={() => setConfirming(false)}>
                Keep
              </Button>
            </span>
          ) : (
            <button type="button" className="pf-btn pf-btn-ghost pf-btn-sm" onClick={() => setConfirming(true)}>
              <Icon name="trash" size={16} /> Delete
            </button>
          )
        ) : (
          <ReportButton targetType="comment" targetId={commentId} canReport={canReport} signInHref={signInHref} />
        )}
      </div>
      {error ? (
        <p role="alert" className="pf-error-text mt-1 text-sm font-semibold">
          {error}
        </p>
      ) : null}
      {replying ? (
        <div className="mt-2">
          <CommentForm postId={postId} parentId={commentId} autoFocus onDone={() => setReplying(false)} placeholder="Write a reply…" />
        </div>
      ) : null}
    </div>
  );
}
