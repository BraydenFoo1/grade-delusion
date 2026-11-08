// Transactional e-mail templates. Pure functions: easy to test, and every interpolated value is
// HTML-escaped (display names are user-controlled) with links restricted to http(s).

export type Mail = { to: string; subject: string; html: string; text: string };

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

function safeUrl(url: string): string {
  const u = new URL(url); // throws on garbage
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Unsafe URL in e-mail");
  return u.toString();
}

function layout(opts: { preview: string; heading: string; body: string; cta?: { label: string; url: string }; footer: string }): string {
  const cta = opts.cta
    ? `<p style="margin:28px 0"><a href="${esc(safeUrl(opts.cta.url))}" style="background:#ffe11a;color:#0b0b0f;border:3px solid #0b0b0f;border-radius:12px;padding:14px 22px;font-weight:700;text-decoration:none;display:inline-block">${esc(opts.cta.label)}</a></p>
       <p style="font-size:13px;color:#555">Button not working? Paste this link into your browser:<br><span style="word-break:break-all">${esc(safeUrl(opts.cta.url))}</span></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#fffdf5;font-family:Arial,Helvetica,sans-serif;color:#0b0b0f">
<span style="display:none;max-height:0;overflow:hidden">${esc(opts.preview)}</span>
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
  <p style="font-size:22px;font-weight:800;letter-spacing:.02em;margin:0 0 24px">GRADE DELUSION™</p>
  <h1 style="font-size:24px;line-height:1.2;margin:0 0 12px">${esc(opts.heading)}</h1>
  <div style="font-size:16px;line-height:1.6">${opts.body}</div>
  ${cta}
  <p style="font-size:12px;color:#777;margin-top:32px;border-top:1px solid #ddd;padding-top:16px">${opts.footer}</p>
</div></body></html>`;
}

const FOOTER = "You got this e-mail because someone used this address on Grade Delusion. If that wasn't you, you can ignore it.";

export function verificationEmail(p: { to: string; name: string; url: string }): Mail {
  return {
    to: p.to,
    subject: "Confirm your Grade Delusion account",
    text: `Hi ${p.name},\n\nConfirm your e-mail address to start posting delusions:\n${p.url}\n\nThe link works for 24 hours. ${FOOTER}`,
    html: layout({
      preview: "Confirm your e-mail to start posting.",
      heading: `Welcome, ${p.name}!`,
      body: "<p>Confirm your e-mail address to start posting delusions. The link works for 24 hours.</p>",
      cta: { label: "Confirm my e-mail", url: p.url },
      footer: esc(FOOTER),
    }),
  };
}

export function resetPasswordEmail(p: { to: string; name: string; url: string }): Mail {
  return {
    to: p.to,
    subject: "Reset your Grade Delusion password",
    text: `Hi ${p.name},\n\nUse this link to choose a new password (valid for 1 hour):\n${p.url}\n\nIf you didn't ask for this, ignore it: your password hasn't changed.`,
    html: layout({
      preview: "Choose a new password.",
      heading: "Reset your password",
      body: `<p>Hi ${esc(p.name)}, use the button below to choose a new password. The link works for 1 hour.</p><p>If you didn't ask for this, ignore this e-mail: your password hasn't changed.</p>`,
      cta: { label: "Choose a new password", url: p.url },
      footer: esc(FOOTER),
    }),
  };
}

export function deleteAccountEmail(p: { to: string; name: string; url: string }): Mail {
  return {
    to: p.to,
    subject: "Confirm deleting your Grade Delusion account",
    text: `Hi ${p.name},\n\nConfirm to permanently delete your account and everything you posted:\n${p.url}\n\nIf you didn't ask for this, ignore it and change your password.`,
    html: layout({
      preview: "Confirm account deletion.",
      heading: "Delete your account?",
      body: `<p>Hi ${esc(p.name)}. Confirming permanently deletes your account, your posts, comments and reactions. This can't be undone.</p><p>If you didn't ask for this, ignore this e-mail and change your password.</p>`,
      cta: { label: "Yes, delete my account", url: p.url },
      footer: esc(FOOTER),
    }),
  };
}

/** Sent to the owner when someone tries to sign up with their address (the sign-up page itself stays neutral). */
export function existingAccountEmail(p: { to: string; name: string; signInUrl: string }): Mail {
  return {
    to: p.to,
    subject: "Someone tried to sign up with your e-mail",
    text: `Hi ${p.name},\n\nSomeone tried to create a Grade Delusion account with this address, but you already have one. Sign in here:\n${p.signInUrl}\n\nForgot your password? Use "Forgot password" on the sign-in page. If this wasn't you, you can ignore this e-mail.`,
    html: layout({
      preview: "You already have an account.",
      heading: "You already have an account",
      body: `<p>Hi ${esc(p.name)}, someone tried to create a Grade Delusion account with this address, but you already have one.</p><p>Forgot your password? Use <b>Forgot password</b> on the sign-in page.</p>`,
      cta: { label: "Go to sign in", url: p.signInUrl },
      footer: esc(FOOTER),
    }),
  };
}
