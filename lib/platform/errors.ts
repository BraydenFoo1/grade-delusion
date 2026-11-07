export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "SUSPENDED"
  | "UNVERIFIED"
  | "UNAVAILABLE";

/** An expected failure with a message that is safe to show the user. Anything else is a bug and stays generic. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fieldErrors?: Record<string, string>;
  readonly retryAfterSec?: number;

  constructor(code: ErrorCode, message: string, opts: { fieldErrors?: Record<string, string>; retryAfterSec?: number } = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = opts.fieldErrors;
    this.retryAfterSec = opts.retryAfterSec;
  }
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode | "INTERNAL"; message: string; fieldErrors?: Record<string, string> } };

export const ok = <T = void>(data?: T): ActionResult<T> => ({ ok: true, data: data as T });

export function fail(err: unknown): ActionResult<never> {
  if (err instanceof AppError) {
    const message =
      err.code === "RATE_LIMITED" && err.retryAfterSec
        ? `${err.message} Try again in ${formatWait(err.retryAfterSec)}.`
        : err.message;
    return { ok: false, error: { code: err.code, message, fieldErrors: err.fieldErrors } };
  }
  // Never leak internals (SQL errors, stack traces) to the browser.
  logUnexpected("[action] unexpected error:", err);
  return { ok: false, error: { code: "INTERNAL", message: "Something went wrong on our side. Please try again." } };
}

/**
 * Log an unexpected failure WITHOUT the query parameters. The database driver puts the bound values in its error
 * ("params: …"), and those are user data (e-mail addresses, post text, search terms): they must not end up in
 * server logs. Keeps the error type, the message, the Postgres cause and the top of the stack, which is what is
 * needed to debug.
 */
/** Cut off bound parameters, mask credentials inside connection strings, and mask anything shaped like an e-mail. */
function redact(text: string): string {
  return text
    .split(/\s*\bparams:/i)[0]
    .replace(/(postgres(?:ql)?:\/\/)[^@\s/]*@/gi, "$1***@")
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email]");
}

export function logUnexpected(scope: string, err: unknown): void {
  const e = (typeof err === "object" && err !== null ? err : { message: String(err) }) as { name?: string; message?: unknown; cause?: { message?: unknown }; stack?: unknown };
  const message = redact(String(e.message ?? "")).slice(0, 300);
  const cause = e.cause?.message ? ` (cause: ${redact(String(e.cause.message)).slice(0, 200)})` : "";
  const frames = typeof e.stack === "string" ? ` | ${e.stack.split("\n").slice(1, 4).map((l) => l.trim()).join(" | ")}` : "";
  console.error(`${scope} ${e.name ?? "Error"}: ${message}${cause}${frames}`);
}

function formatWait(sec: number) {
  const unit = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
  if (sec < 90) return unit(Math.max(1, Math.ceil(sec)), "second");
  if (sec < 5400) return unit(Math.ceil(sec / 60), "minute");
  return unit(Math.ceil(sec / 3600), "hour");
}
