"use client";

import { useEffect } from "react";
import { Button, EmptyState, LinkButton } from "@/components/platform/ui";

/** Anything unexpected on a platform page lands here: friendly message, a retry, and no internals. */
export default function PlatformError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        icon="alert"
        title="Something went wrong on our side"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={reset}>
              Try again
            </Button>
            <LinkButton href="/community">Back to the community</LinkButton>
          </div>
        }
      >
        Nothing you did caused this, and your data is safe. If it keeps happening, e-mail us and mention{" "}
        {error.digest ? <code>{error.digest}</code> : "what you were doing"}.
      </EmptyState>
    </div>
  );
}
