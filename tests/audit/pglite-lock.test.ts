// AUDIT: the embedded database must refuse to be opened by two processes at once.
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { openPglite } from "@/lib/db/pglite";

const base = ".data/lock-test";
const dir = (n: string) => `${base}/${n}`;
afterAll(() => rmSync(path.resolve(process.cwd(), base), { recursive: true, force: true })); // this test's own scratch folder

describe("embedded database process lock", () => {
  it("creates a lock holding our pid and removes it on close", async () => {
    const { close } = await openPglite(dir("a"));
    const lock = path.resolve(process.cwd(), `${dir("a")}.lock`);
    expect(existsSync(lock)).toBe(true);
    await close();
    expect(existsSync(lock)).toBe(false);
  });

  it("refuses a folder that another LIVE process holds, with a message that says what to do", async () => {
    mkdirSync(path.resolve(process.cwd(), base), { recursive: true });
    writeFileSync(path.resolve(process.cwd(), `${dir("b")}.lock`), String(process.ppid)); // the parent shell/test runner is alive
    await expect(openPglite(dir("b"))).rejects.toThrow(/already open in another process.*stop that process first/s);
  });

  it("ignores a stale lock left by a process that no longer exists", async () => {
    mkdirSync(path.resolve(process.cwd(), base), { recursive: true });
    writeFileSync(path.resolve(process.cwd(), `${dir("c")}.lock`), "2999999");
    const { close } = await openPglite(dir("c"));
    await close();
  });

  it("never locks a throw-away in-memory database", async () => {
    const a = await openPglite("memory://");
    const b = await openPglite("memory://");
    await a.close();
    await b.close();
  });
});
