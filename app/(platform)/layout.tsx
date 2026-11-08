import type { ReactNode } from "react";
import { AnnouncementBanner, PlatformFooter, PlatformHeader } from "@/components/platform/Shell";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { isPublicBeta } from "@/lib/platform/mode";
import { unreadCount } from "@/lib/services/notifications";
import { publicAnnouncement } from "@/lib/services/public-read";
import "./platform.css";

// Applies a saved light/dark choice before first paint so there is no flash. Without a saved choice
// the page follows the system (see platform.css).
const THEME_INIT = `try{var t=localStorage.getItem("gd-theme");if(t==="dark"||t==="light")document.documentElement.dataset.pfTheme=t}catch(e){}`;

// Every platform page depends on who is signed in and on live data, so none is ever prerendered.
export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const beta = isPublicBeta();
  // Public beta: nobody is signed in and no database is touched (the announcement comes from static content).
  const actor = await getActor();
  const unread = actor && !beta ? await unreadCount(await getDb(), actor.id) : 0;
  const announcement = await publicAnnouncement();
  return (
    <div data-platform>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      <AnnouncementBanner text={announcement} />
      <PlatformHeader actor={actor} unread={unread} beta={beta} />
      <main id="content" className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 md:pb-12 md:pt-10">
        {children}
      </main>
      <PlatformFooter />
    </div>
  );
}
