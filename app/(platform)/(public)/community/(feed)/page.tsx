import type { Metadata } from "next";
import Link from "next/link";
import PostCard from "@/components/platform/community/PostCard";
import Icon from "@/components/platform/Icon";
import { EmptyState, LinkButton, PageHeader, Pagination } from "@/components/platform/ui";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { isSuspended } from "@/lib/platform/actor";
import { CATEGORIES } from "@/lib/platform/constants";
import { plural } from "@/lib/platform/format";
import { feedQuery } from "@/lib/platform/validation";
import { listPublicPosts } from "@/lib/services/posts";

// User-generated pages stay out of search results by default: they show members' display names, and the
// members include 13-year-olds. To allow indexing, change `index` here and in the post and profile pages.
export const metadata: Metadata = {
  title: "Community",
  description: "Delusions from real students, approved by human moderators.",
  robots: { index: false, follow: true },
};

type Search = { q?: string; category?: string; sort?: string; page?: string };

function href(q: { q?: string; category: string; sort: string; page?: number }) {
  const p = new URLSearchParams();
  if (q.q) p.set("q", q.q);
  if (q.category !== "all") p.set("category", q.category);
  if (q.sort !== "new") p.set("sort", q.sort);
  if (q.page && q.page > 1) p.set("page", String(q.page));
  const s = p.toString();
  return s ? `/community?${s}` : "/community";
}

export default async function CommunityPage({ searchParams }: { searchParams: Promise<Search> }) {
  const raw = await searchParams;
  // Garbage in the URL falls back to defaults instead of erroring.
  const parsed = feedQuery.safeParse(raw);
  const query = parsed.success ? parsed.data : feedQuery.parse({});
  const [actor, db] = await Promise.all([getActor(), getDb()]);
  const result = await listPublicPosts(db, query, { viewerId: actor?.id });
  const viewer = { id: actor?.id ?? null, canParticipate: Boolean(actor && actor.emailVerified && !isSuspended(actor)) };
  const filtered = Boolean(query.q) || query.category !== "all" || query.sort !== "new";

  return (
    <div className="space-y-8">
      <PageHeader title="Community" actions={<LinkButton href="/submit" variant="primary">Submit yours</LinkButton>}>
        Real delusions from real students. Every post was read and approved by a human before it appeared here.
      </PageHeader>

      <div className="space-y-4">
        <form action="/community" role="search" className="flex gap-2">
          <label htmlFor="feed-q" className="sr-only">
            Search delusions and names
          </label>
          <input id="feed-q" name="q" type="search" defaultValue={query.q} placeholder="Search delusions or names" maxLength={80} className="pf-input" />
          {query.category !== "all" ? <input type="hidden" name="category" value={query.category} /> : null}
          {query.sort !== "new" ? <input type="hidden" name="sort" value={query.sort} /> : null}
          <button type="submit" className="pf-btn pf-btn-primary shrink-0">
            <Icon name="search" size={18} /> <span className="hidden sm:inline">Search</span>
            <span className="sr-only sm:hidden">Search</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Category" className="flex flex-wrap gap-2">
            <Link href={href({ ...query, category: "all", page: 1 })} className="pf-chip" aria-current={query.category === "all" ? "true" : undefined}>
              All
            </Link>
            {CATEGORIES.map((c) => (
              <Link key={c.key} href={href({ ...query, category: c.key, page: 1 })} className="pf-chip" aria-current={query.category === c.key ? "true" : undefined}>
                {c.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Sort" className="flex gap-2">
            <Link href={href({ ...query, sort: "new", page: 1 })} className="pf-chip" aria-current={query.sort === "new" ? "true" : undefined}>
              Newest
            </Link>
            <Link href={href({ ...query, sort: "top", page: 1 })} className="pf-chip" aria-current={query.sort === "top" ? "true" : undefined}>
              Most reacted
            </Link>
          </nav>
        </div>
        <p className="pf-muted text-sm" aria-live="polite">
          {filtered ? `${plural(result.total, "match", "matches")}` : plural(result.total, "delusion")}
          {query.q ? ` for “${query.q}”` : ""}
          {filtered ? (
            <>
              {" · "}
              <Link href="/community" className="pf-link">
                Clear filters
              </Link>
            </>
          ) : null}
        </p>
      </div>

      {result.items.length === 0 ? (
        filtered ? (
          <EmptyState icon="search" title="Nothing matches that" action={<LinkButton href="/community">Show everything</LinkButton>}>
            Try fewer words, or a different category. Searches look at the delusion text and the author&apos;s name.
          </EmptyState>
        ) : (
          <EmptyState icon="chat" title="No delusions yet" action={<LinkButton href="/submit" variant="primary">Be the first</LinkButton>}>
            The feed fills up as moderators approve submissions. Yours could be the first one here.
          </EmptyState>
        )
      ) : (
        <ul className="space-y-6">
          {result.items.map((post) => (
            <li key={post.id}>
              <PostCard post={post} viewer={viewer} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(page) => href({ ...query, page })} />
    </div>
  );
}
