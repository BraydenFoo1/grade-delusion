import { z } from "zod";
import {
  CATEGORY_KEYS,
  LIMITS,
  REACTION_KEYS,
  REPORT_REASON_KEYS,
  ROLES,
} from "./constants";
import { AppError } from "./errors";
import { USER_ID_PATTERN } from "./ids";
import { normalizeLine, normalizeText } from "./text";

/** Parse with a schema and convert failures to a VALIDATION error with one message per field. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    fieldErrors[key] ??= issue.message;
  }
  const first = Object.values(fieldErrors)[0] ?? "Please check what you entered.";
  throw new AppError("VALIDATION", first, { fieldErrors });
}

const text = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} is required.` })
    .max(max * 4, `${label} is far too long.`) // cheap guard before normalising
    .transform(normalizeText)
    .pipe(
      z
        .string()
        .min(min, min <= 1 ? `${label} can't be empty.` : `${label} needs at least ${min} characters.`)
        .max(max, `${label} can be at most ${max} characters.`),
    );

const id = z.uuid("That doesn't look like a valid id.");

export const postInput = z.object({
  body: text(LIMITS.postMin, LIMITS.postMax, "Your delusion"),
  category: z.enum(CATEGORY_KEYS, { error: "Pick a category." }),
});

export const commentInput = z.object({
  postId: id,
  parentId: id.optional(),
  body: text(1, LIMITS.commentMax, "Your comment"),
});

export const reactionInput = z.object({
  postId: id,
  kind: z.enum(REACTION_KEYS, { error: "Unknown reaction." }).nullable(),
});

export const reportInput = z.object({
  targetType: z.enum(["post", "comment"]),
  targetId: id,
  reason: z.enum(REPORT_REASON_KEYS, { error: "Pick a reason." }),
  note: z
    .string()
    .transform(normalizeText)
    .pipe(z.string().max(LIMITS.reportNoteMax, `Notes can be at most ${LIMITS.reportNoteMax} characters.`))
    .optional()
    .transform((v) => (v ? v : undefined)),
});

const moderationNote = z
  .string()
  .transform(normalizeText)
  .pipe(z.string().max(LIMITS.moderationNoteMax, `Notes can be at most ${LIMITS.moderationNoteMax} characters.`))
  .optional()
  .transform((v) => (v ? v : undefined));

export const moderateInput = z.object({
  id,
  decision: z.enum(["approve", "reject", "remove", "restore"]),
  note: moderationNote,
  /** editedAt (ISO) of the text the moderator reviewed, "" if never edited. Guards against approving text that changed. */
  version: z.string().max(40).optional(),
});

export const resolveReportInput = z.object({
  id,
  resolution: z.enum(["dismiss", "remove_content", "no_action"]),
  note: moderationNote,
});

export const suspendInput = z.object({
  userId: z.string().regex(USER_ID_PATTERN, "That doesn't look like a valid user id."),
  mode: z.enum(["suspend", "ban"]),
  days: z.coerce.number().int().min(1).max(LIMITS.suspendMaxDays).optional(),
  reason: z
    .string()
    .transform(normalizeText)
    .pipe(z.string().min(3, "Give a short reason.").max(200, "Keep the reason under 200 characters.")),
});

export const roleInput = z.object({
  userId: z.string().regex(USER_ID_PATTERN, "That doesn't look like a valid user id."),
  role: z.enum(ROLES),
});

/** Display names: letters, digits, spaces and . _ ' - ; never an e-mail, link or lookalike of staff. */
export const displayName = z
  .string({ error: "Choose a display name." })
  .max(LIMITS.displayNameMax * 3)
  .transform(normalizeLine)
  .pipe(
    z
      .string()
      .min(LIMITS.displayNameMin, `Use at least ${LIMITS.displayNameMin} characters.`)
      .max(LIMITS.displayNameMax, `Use at most ${LIMITS.displayNameMax} characters.`)
      .regex(/^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u, "Use letters, numbers, spaces and . _ ' - only.")
      .refine((v) => !/@|https?:|www\./i.test(v), "Display names can't contain e-mail addresses or links."),
  );

export const password = z
  .string({ error: "Choose a password." })
  .min(LIMITS.passwordMin, `Use at least ${LIMITS.passwordMin} characters.`)
  .max(LIMITS.passwordMax, `Use at most ${LIMITS.passwordMax} characters.`);

export const signUpInput = z.object({
  name: displayName,
  // Trim and lowercase first: people paste addresses with stray spaces.
  email: z
    .string({ error: "Enter your e-mail address." })
    .transform((v) => v.trim().toLowerCase())
    .pipe(z.email("Enter a valid e-mail address.").max(254, "That e-mail address is too long.")),
  password,
  ageConfirmed: z.literal(true, { error: "You must be 13 or older to join." }),
  termsAccepted: z.literal(true, { error: "Accept the terms and privacy policy to continue." }),
  /** Honeypot: real people never see this field. */
  website: z.string().max(0).optional(),
});

export const profileInput = z.object({
  name: displayName,
  bio: z
    .string()
    .transform(normalizeLine)
    .pipe(z.string().max(LIMITS.bioMax, `Keep your bio under ${LIMITS.bioMax} characters.`))
    .optional()
    .transform((v) => (v ? v : null)),
});

export const feedQuery = z.object({
  q: z
    .string()
    .transform(normalizeLine)
    .pipe(z.string().max(80))
    .optional()
    .transform((v) => (v ? v : undefined)),
  category: z.enum([...CATEGORY_KEYS, "all"] as const).optional().default("all"),
  sort: z.enum(["new", "top"]).optional().default("new"),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
});
export type FeedQuery = Omit<z.output<typeof feedQuery>, "q"> & { q?: string };

/** Platform configuration. Every field has a default so a fresh database works with no rows. */
export const settingsSchema = z.object({
  registrationOpen: z.boolean().default(true),
  submissionsOpen: z.boolean().default(true),
  commentsOpen: z.boolean().default(true),
  allowLinks: z.boolean().default(false),
  dailyPostLimit: z.coerce.number().int().min(1).max(50).default(5),
  dailyCommentLimit: z.coerce.number().int().min(1).max(500).default(40),
  dailyReportLimit: z.coerce.number().int().min(1).max(100).default(20),
  postCooldownSec: z.coerce.number().int().min(0).max(3600).default(30),
  commentCooldownSec: z.coerce.number().int().min(0).max(600).default(10),
  blockedTerms: z.array(z.string().transform(normalizeLine).pipe(z.string().min(2).max(40))).max(200).default([]),
  announcement: z
    .string()
    .transform(normalizeLine)
    .pipe(z.string().max(160))
    .default(""),
});
export type Settings = z.output<typeof settingsSchema>;
