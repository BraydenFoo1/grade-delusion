import type { ReactNode } from "react";
import { AnnouncementBanner, PlatformFooter, PlatformHeader } from "@/components/platform/Shell";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { unreadCount } from "@/lib/services/notifications";
import { getSettings } from "@/lib/services/settings";
import "./platform.css";

// Applies a saved light/dark choice before first paint so there is no flash. Without a saved choice
// the page follows the system (see platform.css).
const THEME_INIT = `try{var t=localStorage.getItem("gd-theme");if(t==="dark"||t==="light")document.documentElement.dataset.pfTheme=t}catch(e){}`;

// Every platform page depends on who is signed in and on live data, so none is ever prerendered.
export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const [actor, db] = await Promise.all([getActor(), getDb()]);
  const [unread, settings] = await Promise.all([actor ? unreadCount(db, actor.id) : Promise.resolve(0), getSettings(db)]);
  return (
    <div data-platform>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      <AnnouncementBanner text={settings.announcement} />
      <PlatformHeader actor={actor} unread={unread} />
      <main id="content" className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 md:pb-12 md:pt-10">
        {children}
      </main>
      <PlatformFooter />
    </div>
  );
}
