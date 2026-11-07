"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deletePostAction, markAllNotificationsReadAction, markNotificationReadAction } from "@/app/actions/community";
import Icon from "../Icon";
import { Button } from "../ui";

/** Two-step inline delete (no modal): "Delete" turns into "Delete this post? Delete / Keep". */
export function DeletePostButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    const res = await deletePostAction(id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error.message);
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {confirming ? (
        <span className="inline-flex items-center gap-1" role="group" aria-label="Confirm delete">
          <span className="pf-muted px-1 text-sm">Delete this post for good?</span>
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
      )}
      {error ? (
        <span role="alert" className="pf-error-text w-full text-sm font-semibold">
          {error}
        </span>
      ) : null}
    </span>
  );
}

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      small
      loading={busy}
      disabled={disabled}
      onClick={async () => {
        setBusy(true);
        await markAllNotificationsReadAction();
        setBusy(false);
        router.refresh();
      }}
    >
      <Icon name="check" size={16} /> Mark all as read
    </Button>
  );
}

export function MarkReadButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      small
      variant="ghost"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await markNotificationReadAction(id);
        setBusy(false);
        router.refresh();
      }}
    >
      Mark read
    </Button>
  );
}
