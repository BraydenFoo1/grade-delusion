// Locale- and timezone-fixed formatting. The audience is in Singapore, and fixing the zone means the
// server and browser always agree (no hydration mismatches).

const TZ = "Asia/Singapore";
const dateFmt = new Intl.DateTimeFormat("en-SG", { dateStyle: "medium", timeZone: TZ });
const dateTimeFmt = new Intl.DateTimeFormat("en-SG", { dateStyle: "medium", timeStyle: "short", timeZone: TZ });

export const formatDate = (d: Date | string) => dateFmt.format(new Date(d));
export const formatDateTime = (d: Date | string) => dateTimeFmt.format(new Date(d));

/** "just now", "5 min ago", "3 h ago", "2 d ago", then a calendar date. */
export function timeAgo(d: Date | string, now = new Date()): string {
  const date = new Date(d);
  const sec = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (sec < 45) return "just now";
  if (sec < 90 * 60) return `${Math.max(1, Math.round(sec / 60))} min ago`;
  if (sec < 36 * 3600) return `${Math.round(sec / 3600)} h ago`;
  if (sec < 7 * 86400) return `${Math.round(sec / 86400)} d ago`;
  return formatDate(date);
}

/** "1 post", "3 posts". */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
