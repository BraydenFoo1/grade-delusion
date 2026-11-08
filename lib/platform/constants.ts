// Shared, dependency-free constants for the community platform.
// Imported by the database schema (via relative path), the services, the UI and the tests,
// so keep this file free of server-only imports.

export const ROLES = ["user", "moderator", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const POST_STATUSES = ["pending", "approved", "rejected", "removed"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const COMMENT_STATUSES = ["visible", "removed"] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

/** Same four tags as the memes on the home page, so the two feel like one product. */
export const CATEGORIES = [
  { key: "exams", label: "Exams", emoji: "📝" },
  { key: "studying", label: "Studying", emoji: "📚" },
  { key: "results", label: "Results", emoji: "📈" },
  { key: "life", label: "Student life", emoji: "🎒" },
] as const;
export type CategoryKey = (typeof CATEGORIES)[number]["key"];
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as unknown as readonly [CategoryKey, ...CategoryKey[]];

export const REACTIONS = [
  { key: "relatable", label: "Relatable", emoji: "😭" },
  { key: "dead", label: "I'm dead", emoji: "💀" },
  { key: "delusional", label: "Delusional", emoji: "🧠" },
  { key: "fire", label: "Fire", emoji: "🔥" },
] as const;
export type ReactionKey = (typeof REACTIONS)[number]["key"];
export const REACTION_KEYS = REACTIONS.map((r) => r.key) as unknown as readonly [ReactionKey, ...ReactionKey[]];

export const REPORT_REASONS = [
  { key: "spam", label: "Spam or advertising" },
  { key: "harassment", label: "Bullying or harassment" },
  { key: "hate", label: "Hateful content" },
  { key: "sexual", label: "Sexual content" },
  { key: "self_harm", label: "Self-harm or danger" },
  { key: "personal_info", label: "Shares personal information" },
  { key: "other", label: "Something else" },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]["key"];
export const REPORT_REASON_KEYS = REPORT_REASONS.map((r) => r.key) as unknown as readonly [ReportReason, ...ReportReason[]];

export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "post_approved",
  "post_rejected",
  "post_removed",
  "comment_on_post",
  "reply_to_comment",
  "comment_removed",
  "report_resolved",
  "account_suspended",
  "account_restored",
  "role_changed",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const MODERATION_ACTIONS = [
  "post_approved",
  "post_rejected",
  "post_removed",
  "post_restored",
  "comment_removed",
  "comment_restored",
  "report_resolved",
  "report_dismissed",
  "user_suspended",
  "user_banned",
  "user_restored",
] as const;
export type ModerationActionType = (typeof MODERATION_ACTIONS)[number];

export const MODERATION_TARGETS = ["post", "comment", "report", "user"] as const;
export type ModerationTarget = (typeof MODERATION_TARGETS)[number];

/** Hard limits that the database also enforces with CHECK constraints. */
export const LIMITS = {
  postMin: 10,
  postMax: 500,
  commentMax: 300,
  reportNoteMax: 300,
  moderationNoteMax: 300,
  displayNameMin: 2,
  displayNameMax: 30,
  bioMax: 160,
  passwordMin: 10,
  passwordMax: 128,
  pageSize: 12,
  adminPageSize: 20,
  /** A suspension is capped so it can't silently become permanent. */
  suspendMaxDays: 90,
} as const;

/** How long rejected posts are kept before the retention job may delete them. */
export const REJECTED_RETENTION_DAYS = 30;

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Better Auth stores the role as free text; anything unknown is treated as a plain user. */
export function toRole(value: unknown): Role {
  return isRole(value) ? value : "user";
}

export function categoryLabel(key: string) {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export function categoryEmoji(key: string) {
  return CATEGORIES.find((c) => c.key === key)?.emoji ?? "🎒";
}
