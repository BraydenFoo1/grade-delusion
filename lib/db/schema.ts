// Relational schema for the community platform.
//
// Two groups of tables:
//   1. Better Auth tables (user, session, account, verification, rateLimit): names and fields follow
//      what Better Auth + its admin plugin expect. Extra user columns are declared in lib/auth/create.ts.
//   2. Application tables (post, comment, reaction, notification, report, moderation_action,
//      audit_log, site_setting, app_rate_limit).
//
// Design rules:
//   - Anything a user owns is deleted with the user (ON DELETE CASCADE), so account deletion is real.
//   - "Who did it" columns on moderation records point at the user with ON DELETE SET NULL, and
//     moderation_action / audit_log deliberately have NO foreign keys: history must outlive accounts.
//   - Enumerated values are TEXT + CHECK (not pg enums) so adding a value is a one-line migration.
//   - Keep this file free of path aliases: drizzle-kit loads it directly.

import { sql, type SQL } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  CATEGORIES,
  COMMENT_STATUSES,
  LIMITS,
  MODERATION_ACTIONS,
  MODERATION_TARGETS,
  NOTIFICATION_TYPES,
  POST_STATUSES,
  REACTIONS,
  REPORT_REASONS,
  REPORT_STATUSES,
} from "../platform/constants";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/** `column IN ('a','b',…)` built from our own constants (never user input). */
function oneOf(column: AnyPgColumn, values: readonly string[]): SQL {
  return sql`${column} in (${sql.join(
    values.map((v) => sql.raw(`'${v}'`)),
    sql`, `,
  )})`;
}

/* ------------------------------------------------------------------ */
/* Better Auth                                                        */
/* ------------------------------------------------------------------ */

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    /** The public display name. Never the e-mail address. */
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    // Better Auth admin plugin
    role: text("role").notNull().default("user"),
    banned: boolean("banned").notNull().default(false),
    banReason: text("ban_reason"),
    banExpires: ts("ban_expires"),
    // Platform fields
    bio: text("bio"),
    ageConfirmedAt: ts("age_confirmed_at"),
    termsAcceptedAt: ts("terms_accepted_at"),
  },
  (t) => [
    check("user_role_check", oneOf(t.role, ["user", "moderator", "admin"])),
    check("user_bio_length", sql`${t.bio} is null or char_length(${t.bio}) <= ${sql.raw(String(LIMITS.bioMax))}`),
    index("user_role_idx").on(t.role),
    index("user_created_idx").on(t.createdAt),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: ts("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: ts("access_token_expires_at"),
    refreshTokenExpiresAt: ts("refresh_token_expires_at"),
    scope: text("scope"),
    /** scrypt hash (never the plain password). */
    password: text("password"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/** Better Auth's built-in rate limiter (sign-in, password reset, …) stores counters here. */
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/* ------------------------------------------------------------------ */
/* Posts, comments, reactions                                         */
/* ------------------------------------------------------------------ */

export const post = pgTable(
  "post",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    category: text("category").notNull().default("life"),
    /** New posts are always `pending` (pre-moderation). */
    status: text("status").notNull().default("pending"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    editedAt: ts("edited_at"),
    /** When the post first went live; the public feed sorts on this. */
    publishedAt: ts("published_at"),
    moderatedById: text("moderated_by_id").references(() => user.id, { onDelete: "set null" }),
    moderatedAt: ts("moderated_at"),
    /** Shown to the author on rejection/removal. */
    moderationNote: text("moderation_note"),
  },
  (t) => [
    check("post_status_check", oneOf(t.status, POST_STATUSES)),
    check(
      "post_category_check",
      oneOf(
        t.category,
        CATEGORIES.map((c) => c.key),
      ),
    ),
    check("post_body_length", sql`char_length(${t.body}) between 1 and ${sql.raw(String(LIMITS.postMax))}`),
    check("post_note_length", sql`${t.moderationNote} is null or char_length(${t.moderationNote}) <= 300`),
    index("post_status_created_idx").on(t.status, t.createdAt.desc()),
    index("post_feed_idx").on(t.status, t.publishedAt.desc()),
    index("post_author_created_idx").on(t.authorId, t.createdAt.desc()),
    index("post_category_feed_idx").on(t.category, t.status, t.publishedAt.desc()),
  ],
);

export const comment = pgTable(
  "comment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Replies point at a top-level comment; replies to replies are not allowed (checked in the service). */
    parentId: uuid("parent_id").references((): AnyPgColumn => comment.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: text("status").notNull().default("visible"),
    createdAt: ts("created_at").notNull().defaultNow(),
    removedById: text("removed_by_id").references(() => user.id, { onDelete: "set null" }),
    removedAt: ts("removed_at"),
    removalNote: text("removal_note"),
  },
  (t) => [
    check("comment_status_check", oneOf(t.status, COMMENT_STATUSES)),
    check("comment_body_length", sql`char_length(${t.body}) between 1 and ${sql.raw(String(LIMITS.commentMax))}`),
    index("comment_post_created_idx").on(t.postId, t.createdAt),
    index("comment_author_created_idx").on(t.authorId, t.createdAt.desc()),
    index("comment_parent_idx").on(t.parentId),
  ],
);

/** One reaction per user per post (changing it replaces the old one). */
export const reaction = pgTable(
  "reaction",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.userId] }),
    check(
      "reaction_kind_check",
      oneOf(
        t.kind,
        REACTIONS.map((r) => r.key),
      ),
    ),
    index("reaction_post_kind_idx").on(t.postId, t.kind),
    index("reaction_user_idx").on(t.userId, t.createdAt.desc()),
  ],
);

/* ------------------------------------------------------------------ */
/* Notifications and reports                                          */
/* ------------------------------------------------------------------ */

export const notification = pgTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    postId: uuid("post_id").references(() => post.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id").references(() => comment.id, { onDelete: "cascade" }),
    /** Short plain-text message written by the server; never user-supplied HTML. */
    message: text("message").notNull(),
    readAt: ts("read_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    check("notification_type_check", oneOf(t.type, NOTIFICATION_TYPES)),
    index("notification_user_created_idx").on(t.userId, t.createdAt.desc()),
    index("notification_unread_idx").on(t.userId).where(sql`${t.readAt} is null`),
  ],
);

export const report = pgTable(
  "report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null once the reporter deletes their account; the report itself stays for moderators. */
    reporterId: text("reporter_id").references(() => user.id, { onDelete: "set null" }),
    postId: uuid("post_id").references(() => post.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id").references(() => comment.id, { onDelete: "cascade" }),
    /** Author of the reported content, for grouping repeat offenders. */
    targetAuthorId: text("target_author_id").references(() => user.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    note: text("note"),
    /** Copy of the text at report time, so later edits can't hide what was reported. */
    contentSnapshot: text("content_snapshot").notNull(),
    status: text("status").notNull().default("open"),
    resolution: text("resolution"),
    resolvedById: text("resolved_by_id").references(() => user.id, { onDelete: "set null" }),
    resolvedAt: ts("resolved_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    check(
      "report_reason_check",
      oneOf(
        t.reason,
        REPORT_REASONS.map((r) => r.key),
      ),
    ),
    check("report_status_check", oneOf(t.status, REPORT_STATUSES)),
    check("report_one_target", sql`(${t.postId} is not null)::int + (${t.commentId} is not null)::int = 1`),
    check("report_note_length", sql`${t.note} is null or char_length(${t.note}) <= ${sql.raw(String(LIMITS.reportNoteMax))}`),
    // A user can only have one open report per target.
    uniqueIndex("report_open_post_unique")
      .on(t.reporterId, t.postId)
      .where(sql`${t.status} = 'open' and ${t.postId} is not null`),
    uniqueIndex("report_open_comment_unique")
      .on(t.reporterId, t.commentId)
      .where(sql`${t.status} = 'open' and ${t.commentId} is not null`),
    index("report_status_created_idx").on(t.status, t.createdAt),
    index("report_post_idx").on(t.postId),
    index("report_comment_idx").on(t.commentId),
  ],
);

/* ------------------------------------------------------------------ */
/* Moderation history, audit log, settings, rate limiting             */
/* ------------------------------------------------------------------ */

/** Every decision a moderator or admin makes about content or a user. Append-only (see migration 0001). */
export const moderationAction = pgTable(
  "moderation_action",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").notNull(),
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    /** The user affected (content author or the user acted on), for per-user history. */
    targetUserId: text("target_user_id"),
    note: text("note"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    check("moderation_action_check", oneOf(t.action, MODERATION_ACTIONS)),
    check("moderation_target_check", oneOf(t.targetType, MODERATION_TARGETS)),
    index("moderation_target_idx").on(t.targetType, t.targetId, t.createdAt.desc()),
    index("moderation_user_idx").on(t.targetUserId, t.createdAt.desc()),
    index("moderation_created_idx").on(t.createdAt.desc()),
  ],
);

/** Security-relevant actions across the platform. Append-only: a trigger rejects UPDATE and DELETE. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id"),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    /** Structured, non-sensitive context (ids and states, never post text or e-mail addresses). */
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_created_idx").on(t.createdAt.desc()),
    index("audit_actor_idx").on(t.actorId, t.createdAt.desc()),
    index("audit_action_idx").on(t.action, t.createdAt.desc()),
    index("audit_target_idx").on(t.targetType, t.targetId),
  ],
);

/** Platform configuration edited from the admin portal (key → JSON value). */
export const siteSetting = pgTable("site_setting", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedById: text("updated_by_id").references(() => user.id, { onDelete: "set null" }),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/** Fixed-window counters for application actions (reactions, reports, search…). */
export const appRateLimit = pgTable("app_rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: bigint("window_start", { mode: "number" }).notNull(),
});
