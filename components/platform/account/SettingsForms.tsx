"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { updateProfileAction } from "@/app/actions/account";
import { authClient } from "@/lib/auth/client";
import { LIMITS } from "@/lib/platform/constants";
import { Button, Field, Notice, describe } from "../ui";

export function ProfileForm({ name, bio }: { name: string; bio: string }) {
  const router = useRouter();
  const id = useId();
  const [form, setForm] = useState({ name, bio });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    setSaved(false);
    const res = await updateProfileAction(form);
    setBusy(false);
    if (!res.ok) {
      setError(res.error.message);
      setFields(res.error.fieldErrors ?? {});
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && Object.keys(fields).length === 0 ? <Notice tone="error">{error}</Notice> : null}
      {saved ? <Notice tone="ok">Profile saved.</Notice> : null}
      <Field label="Display name" htmlFor={`${id}-name`} hint="Shown on your posts and comments." error={fields.name}>
        <input id={`${id}-name`} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={LIMITS.displayNameMax} required className="pf-input" {...describe(`${id}-name`, fields.name, true)} />
      </Field>
      <Field label="Bio (optional)" htmlFor={`${id}-bio`} hint={`${LIMITS.bioMax - form.bio.length} characters left. No links or contact details.`} error={fields.bio}>
        <textarea id={`${id}-bio`} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} maxLength={LIMITS.bioMax} rows={2} className="pf-input !min-h-0" {...describe(`${id}-bio`, fields.bio, true)} />
      </Field>
      <Button type="submit" variant="primary" loading={busy}>
        Save profile
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const id = useId();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setDone(false);
    const { error: err } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    setBusy(false);
    if (err) return setError(err.status === 400 || err.status === 401 ? "Your current password isn't right, or the new one is too short." : err.message || "Couldn't change the password.");
    setCurrent("");
    setNext("");
    setDone(true);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {done ? <Notice tone="ok">Password changed. Your other devices were signed out.</Notice> : null}
      <Field label="Current password" htmlFor={`${id}-current`}>
        <input id={`${id}-current`} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required className="pf-input" />
      </Field>
      <Field label="New password" htmlFor={`${id}-new`} hint={`At least ${LIMITS.passwordMin} characters.`}>
        <input id={`${id}-new`} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={LIMITS.passwordMin} maxLength={LIMITS.passwordMax} required className="pf-input" {...describe(`${id}-new`, undefined, true)} />
      </Field>
      <Button type="submit" loading={busy}>
        Change password
      </Button>
    </form>
  );
}

type SessionRow = { token: string; userAgent?: string | null; createdAt: Date | string; ipAddress?: string | null };

/** Where you're signed in. Lets you sign out everywhere else (a lost phone, a shared computer). */
export function SessionsPanel() {
  const router = useRouter();
  const { data: current } = authClient.useSession();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data, error: err } = await authClient.listSessions();
    if (err) setError("Couldn't load your sessions.");
    else setSessions(data as SessionRow[]);
  }
  useEffect(() => {
    void load();
  }, []);

  const label = (ua?: string | null) => {
    if (!ua) return "Unknown device";
    const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
    const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
    return os ? `${browser} on ${os}` : browser;
  };

  async function signOutOthers() {
    setBusy(true);
    await authClient.revokeOtherSessions();
    await load();
    setBusy(false);
    router.refresh();
  }

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!sessions) return <p className="pf-muted">Loading…</p>;
  const others = sessions.filter((s) => s.token !== current?.session.token).length;
  return (
    <div className="space-y-4">
      <ul className="divide-y-2 divide-(--pf-line-soft)">
        {sessions.map((s) => (
          <li key={s.token} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <span className="font-semibold">{label(s.userAgent)}</span>
            <span className="pf-muted text-sm">
              {s.token === current?.session.token ? "This device" : `Signed in ${new Date(s.createdAt).toLocaleDateString("en-SG", { dateStyle: "medium" })}`}
            </span>
          </li>
        ))}
      </ul>
      <Button small loading={busy} disabled={others === 0} onClick={signOutOthers}>
        {others === 0 ? "No other devices" : `Sign out ${others} other ${others === 1 ? "device" : "devices"}`}
      </Button>
    </div>
  );
}

export function DeleteAccountForm() {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await authClient.deleteUser({ password });
    if (err) {
      setBusy(false);
      return setError(err.status === 400 || err.status === 401 ? "That password isn't right." : err.message || "Couldn't delete the account.");
    }
    router.push("/sign-in?notice=deleted");
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete my account…
      </Button>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Notice tone="error">
        <b>This can&apos;t be undone.</b> Your account, posts, comments and reactions are deleted for good. Moderation records that mention your user id (not your name or e-mail) are kept, as described in the Privacy Policy.
      </Notice>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Field label="Enter your password to confirm" htmlFor={`${id}-pw`}>
        <input id={`${id}-pw`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="pf-input" />
      </Field>
      <label className="flex items-start gap-3 text-[0.9375rem]">
        <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-1 size-5 shrink-0 accent-(--hot)" />
        <span>I understand my account and everything I posted will be permanently deleted.</span>
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="danger" loading={busy} disabled={!sure || !password}>
          Delete everything
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
