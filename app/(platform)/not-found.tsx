import type { Metadata } from "next";
import { EmptyState, LinkButton } from "@/components/platform/ui";

export const metadata: Metadata = { title: "Not found", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        icon="search"
        title="We can't find that page"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <LinkButton href="/community" variant="primary">
              Browse the community
            </LinkButton>
            <LinkButton href="/">Home</LinkButton>
          </div>
        }
      >
        It may have been removed, or the link might be wrong. Posts only appear here after a moderator approves them.
      </EmptyState>
    </div>
  );
}
