"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { signUpAction } from "@/app/actions/account";
import { authClient } from "@/lib/auth/client";
import { LIMITS } from "@/lib/platform/constants";
import { safeNext } from "@/lib/platform/redirect";
import { Button, Field, Notice, describe } from "../ui";

/** Map Better Auth's error shapes to messages that say what happened and what to do next. */
function authMessage(error: { status?: number; code?: string; message?: string } | null | undefined): string {
  if (!error) return "";
  if (error.status === 429) return "Too many attempts. Wait a minute and try again.";
  if (error.status === 401) return "That e-mail and password don't match. Check them and try again.";
  if (error.code === "BANNED_USER") return "This account is suspended. If you think that's a mistake, e-mail the Grade Delusion team.";
  return error.message || "Something went wrong. Please try again.";
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  error,
  hint,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  error?: string;
  hint?: boolean;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        type={shown ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        minLength={autoComplete === "new-password" ? LIMITS.passwordMin : undefined}
        maxLength={LIMITS.passwordMax}
        className="pf-input pr-20"
        {...describe(id, error, hint)}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-pressed={shown}
        className="pf-btn pf-btn-ghost pf-btn-sm absolute right-1 top-1/2 -translate-y-1/2"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export function SignInForm({ next, notice }: { next?: string; notice?: "reset" | "verified" | "deleted" }) {
  const router = useRouter();
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [unverified, setUnverified] = useState(false);
  const destination = safeNext(next);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setUnverified(false);
    const { error: err } = await authClient.signIn.email({ email: email.trim(), password, callbackURL: destination });
    if (err) {
      if (err.status === 403 && err.code !== "BANNED_USER") setUnverified(true); // e-mail not verified: a fresh link was sent
      else setError(authMessage(err));
      setBusy(false);
      return;
    }
    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate={false}>
      {notice === "reset" ? <Notice tone="ok">Password changed. Sign in with your new password.</Notice> : null}
      {notice === "verified" ? <Notice tone="ok">E-mail confirmed. You can sign in now.</Notice> : null}
      {notice === "deleted" ? <Notice tone="info">Your account was deleted. Take care of yourself, and your grades.</Notice> : null}
      {unverified ? (
        <Notice tone="info">
          <b>Confirm your e-mail first.</b> We just sent a fresh link to that address. Open it, then sign in.
        </Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Field label="E-mail" htmlFor={`${id}-email`}>
        <input
          id={`${id}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          required
          className="pf-input"
        />
      </Field>
      <Field label="Password" htmlFor={`${id}-password`}>
        <PasswordInput id={`${id}-password`} value={password} onChange={setPassword} autoComplete="current-password" />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="submit" variant="primary" loading={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <Link href="/forgot-password" className="pf-link text-sm">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const id = useId();
  const [form, setForm] = useState({ name: "", email: "", password: "", ageConfirmed: false, termsAccepted: false, website: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    const res = await signUpAction(form);
    if (res.ok) {
      router.push("/check-email");
      return;
    }
    setError(res.error.message);
    setFields(res.error.fieldErrors ?? {});
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Field label="Display name" htmlFor={`${id}-name`} hint="This is the name other students see. Not your e-mail." error={fields.name}>
        <input
          id={`${id}-name`}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          autoComplete="nickname"
          required
          minLength={LIMITS.displayNameMin}
          maxLength={LIMITS.displayNameMax}
          className="pf-input"
          {...describe(`${id}-name`, fields.name, true)}
        />
      </Field>
      <Field label="E-mail" htmlFor={`${id}-email`} hint="We'll send a link to confirm it. We never show it to anyone." error={fields.email}>
        <input
          id={`${id}-email`}
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          autoComplete="email"
          inputMode="email"
          required
          className="pf-input"
          {...describe(`${id}-email`, fields.email, true)}
        />
      </Field>
      <Field label="Password" htmlFor={`${id}-password`} hint={`At least ${LIMITS.passwordMin} characters. A few random words works well.`} error={fields.password}>
        <PasswordInput
          id={`${id}-password`}
          value={form.password}
          onChange={(v) => set("password", v)}
          autoComplete="new-password"
          error={fields.password}
          hint
        />
      </Field>

      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
      </div>

      <fieldset className="space-y-3">
        <legend className="sr-only">Confirmations</legend>
        <label className="flex items-start gap-3 text-[0.9375rem]">
          <input
            type="checkbox"
            checked={form.ageConfirmed}
            onChange={(e) => set("ageConfirmed", e.target.checked)}
            required
            className="mt-1 size-5 shrink-0 accent-(--hot)"
          />
          <span>I&apos;m 13 or older.</span>
        </label>
        {fields.ageConfirmed ? <p className="pf-error-text text-sm font-semibold">{fields.ageConfirmed}</p> : null}
        <label className="flex items-start gap-3 text-[0.9375rem]">
          <input
            type="checkbox"
            checked={form.termsAccepted}
            onChange={(e) => set("termsAccepted", e.target.checked)}
            required
            className="mt-1 size-5 shrink-0 accent-(--hot)"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="pf-link" target="_blank">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="pf-link" target="_blank">
              Privacy Policy
            </Link>
            , including the community rules.
          </span>
        </label>
        {fields.termsAccepted ? <p className="pf-error-text text-sm font-semibold">{fields.termsAccepted}</p> : null}
      </fieldset>

      <Button type="submit" variant="primary" loading={busy} className="w-full">
        {busy ? "Creating your account…" : "Create account"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: "/reset-password" });
    setBusy(false);
    // Same answer whether or not the address has an account, so this form can't be used to find out who is registered.
    if (err?.status === 429) setError(authMessage(err));
    else setSent(true);
  }

  if (sent) {
    return (
      <Notice tone="ok">
        <b>Check your inbox.</b> If that address has an account, a reset link is on its way. It works for one hour.
      </Notice>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Field label="E-mail" htmlFor={`${id}-email`}>
        <input id={`${id}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required className="pf-input" />
      </Field>
      <Button type="submit" variant="primary" loading={busy}>
        {busy ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token, invalid }: { token?: string; invalid?: boolean }) {
  const router = useRouter();
  const id = useId();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (invalid || !token) {
    return (
      <div className="space-y-4">
        <Notice tone="error">This reset link is invalid or has expired. Links work once, for one hour.</Notice>
        <Link href="/forgot-password" className="pf-btn pf-btn-primary">
          Get a new link
        </Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await authClient.resetPassword({ newPassword: password, token: token as string });
    if (err) {
      setError(err.message || "That link didn't work. Ask for a new one.");
      setBusy(false);
      return;
    }
    router.push("/sign-in?notice=reset");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Field label="New password" htmlFor={`${id}-password`} hint={`At least ${LIMITS.passwordMin} characters. You'll be signed out on every device.`}>
        <PasswordInput id={`${id}-password`} value={password} onChange={setPassword} autoComplete="new-password" hint />
      </Field>
      <Button type="submit" variant="primary" loading={busy}>
        {busy ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
