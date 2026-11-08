import { Skeleton } from "@/components/platform/ui";

/** Skeleton shaped like the feed, so the page doesn't jump when real posts arrive. */
export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading the community feed">
      <div className="space-y-3">
        <Skeleton className="h-11 w-64" />
        <Skeleton className="h-5 w-full max-w-md" />
      </div>
      <Skeleton className="h-11 w-full" />
      <ul className="space-y-6">
        {[0, 1, 2].map((i) => (
          <li key={i} className="pf-card space-y-4 p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 !rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-9 w-72" />
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
