// AUDIT: hostile / malformed input against every service entry point.
//
// Server actions receive whatever JSON a client chooses to send, so every function reachable from an action
// must either succeed or fail with an AppError (a friendly, safe message). Anything else (a raw database
// error, a TypeError) becomes a generic "something went wrong" 500 and is a robustness bug.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Actor } from "@/lib/platform/actor";
import { AppError } from "@/lib/platform/errors";
import { listAudit } from "@/lib/services/audit";
import { createComment, deleteOwnComment, listComments, listCommentsForStaff, moderateComment } from "@/lib/services/comments";
import { markRead } from "@/lib/services/notifications";
import { createPost, deleteOwnPost, getOwnPost, getPostForStaff, getPublicPost, listOwnPosts, listPostsForStaff, listPublicPosts, moderatePost, updateOwnPost } from "@/lib/services/posts";
import { setReaction } from "@/lib/services/reactions";
import { createReport, resolveReport } from "@/lib/services/reports";
import { updateSettings } from "@/lib/services/settings";
import { getPublicProfile, getUserDetail, listUsers, restoreUser, setUserRole, suspendUser, updateProfile } from "@/lib/services/users";
import { createTestDb, makeUser, resetDb, type TestDb } from "../helpers/db";
import { approvedPost, noCooldowns, uniqueBody } from "../helpers/fixtures";

let db: TestDb;
let close: () => Promise<void>;
let member: Actor, mod: Actor, admin: Actor;
let livePost: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(async () => close());
beforeEach(async () => {
  await resetDb(db);
  await noCooldowns(db);
  member = await makeUser(db, { name: "Member" });
  mod = await makeUser(db, { name: "Mod", role: "moderator" });
  admin = await makeUser(db, { name: "Admin", role: "admin" });
  livePost = await approvedPost(db, member, mod);
});

// Everything a JSON body can contain, plus the nasty strings.
const GARBAGE: unknown[] = [
  undefined,
  null,
  0,
  -1,
  1e21,
  true,
  "",
  " ",
  "x".repeat(50_000),
  "'; DROP TABLE post; --",
  "\" OR 1=1 --",
  "%",
  "_",
  "\\",
  "\u0000",
  "\ud800", // lone surrogate
  "<script>alert(1)</script>",
  "../../etc/passwd",
  "123e4567-e89b-42d3-a456-42661417400g",
  "00000000-0000-0000-0000-000000000000",
  {},
  [],
  [1, 2, 3],
  { id: {}, decision: [], note: 5, body: {}, category: [], kind: {}, userId: [], role: {}, reason: null },
  { __proto__: { polluted: true } },
  JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"x": 1}}}'),
];

const leaks: string[] = [];
async function expectSafe(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    if (e instanceof AppError) return;
    const err = e as Error & { cause?: Error };
    leaks.push(`${label}: ${err.name}: ${(err.cause?.message ?? err.message).slice(0, 110)}`);
  }
}
/** One line per distinct function, so a single bug isn't reported 25 times. */
const distinct = () => [...new Map(leaks.map((l) => [l.split("(")[0], l])).values()];

describe("every action-reachable service survives garbage", () => {
  it("input-object services (zod-validated)", async () => {
    const cases: [string, (g: unknown) => Promise<unknown>][] = [
      ["createPost", (g) => createPost(db, member, g)],
      ["updateOwnPost(input)", (g) => updateOwnPost(db, member, livePost, g)],
      ["createComment", (g) => createComment(db, member, g)],
      ["setReaction", (g) => setReaction(db, member, g)],
      ["createReport", (g) => createReport(db, member, g)],
      ["updateProfile", (g) => updateProfile(db, member, g)],
      ["moderatePost", (g) => moderatePost(db, mod, g)],
      ["resolveReport", (g) => resolveReport(db, mod, g)],
      ["suspendUser", (g) => suspendUser(db, mod, g)],
      ["setUserRole", (g) => setUserRole(db, admin, g)],
      ["updateSettings", (g) => updateSettings(db, admin, g)],
    ];
    for (const [label, call] of cases) for (const g of GARBAGE) await expectSafe(`${label}(${JSON.stringify(g)?.slice(0, 40)})`, () => call(g));
  });

  it("id-taking services (strings, numbers, objects as ids)", async () => {
    const cases: [string, (g: never) => Promise<unknown>][] = [
      ["deleteOwnPost", (g) => deleteOwnPost(db, member, g)],
      ["deleteOwnComment", (g) => deleteOwnComment(db, member, g)],
      ["markRead", (g) => markRead(db, member.id, g)],
      ["updateOwnPost(id)", (g) => updateOwnPost(db, member, g, { body: uniqueBody(), category: "life" })],
      ["moderateComment", (g) => moderateComment(db, mod, { id: g, decision: "remove" })],
      ["moderateComment(decision)", (g) => moderateComment(db, mod, { id: livePost, decision: g as "remove" })],
      ["restoreUser", (g) => restoreUser(db, mod, g)],
      ["getPublicPost", (g) => getPublicPost(db, g)],
      ["getOwnPost", (g) => getOwnPost(db, member, g)],
      ["getPostForStaff", (g) => getPostForStaff(db, mod, g)],
      ["listComments", (g) => listComments(db, g)],
      ["getPublicProfile", (g) => getPublicProfile(db, g)],
      ["getUserDetail", (g) => getUserDetail(db, mod, g)],
    ];
    for (const [label, call] of cases) for (const g of GARBAGE) await expectSafe(`${label}(${JSON.stringify(g)?.slice(0, 40)})`, () => call(g as never));
  });

  it("list services with absurd paging and filters", async () => {
    const pages = [0, -5, 1.5, NaN, 1e15, 1e20, Number.MAX_SAFE_INTEGER];
    for (const page of pages) {
      await expectSafe(`listPublicPosts(page=${page})`, () => listPublicPosts(db, { category: "all", sort: "new", page } as never));
      await expectSafe(`listOwnPosts(page=${page})`, () => listOwnPosts(db, member, { page }));
      await expectSafe(`listPostsForStaff(page=${page})`, () => listPostsForStaff(db, mod, { page }));
    }
    await expectSafe("listPublicPosts(q=%)", () => listPublicPosts(db, { category: "all", sort: "new", page: 1, q: "%_\\'\"" } as never));
    // control characters in free-text filters (staff search boxes are not zod-normalised)
    for (const q of ["\u0000", "a\u0000b", "\u0001\u001f", "\ud800", "%\u0000%"]) {
      await expectSafe(`listPublicPosts(q=${JSON.stringify(q)})`, () => listPublicPosts(db, { category: "all", sort: "new", page: 1, q } as never));
      await expectSafe(`listPostsForStaff(q=${JSON.stringify(q)})`, () => listPostsForStaff(db, mod, { q }));
      await expectSafe(`listCommentsForStaff(q=${JSON.stringify(q)})`, () => listCommentsForStaff(db, mod, { q }));
      await expectSafe(`listUsers(q=${JSON.stringify(q)})`, () => listUsers(db, admin, { q }));
      await expectSafe(`listAudit(action=${JSON.stringify(q)})`, () => listAudit(db, admin, { action: q }));
    }
  });

  it("collected: no function leaked a raw error", () => {
    expect(distinct(), `\n${distinct().join("\n")}\n`).toEqual([]);
  });

  it("garbage never pollutes Object.prototype", () => {
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
});

describe("garbage that IS valid must be stored faithfully, never corrupt the database", () => {
  it("rejects NUL bytes and lone surrogates cleanly instead of 500ing", async () => {
    for (const body of [`${uniqueBody()}\u0000hidden`, `${uniqueBody()} \ud800`]) {
      await expectSafe("createPost(special chars)", () => createPost(db, member, { body, category: "life" }));
    }
  });
});
