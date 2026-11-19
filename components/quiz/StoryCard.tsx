"use client";

import { useEffect, useState } from "react";
import { renderCard, telegramUrl, whatsappUrl, type CardData, type RenderedImage } from "@/lib/share-card";
import { shareText } from "@/lib/parody-quiz";
import { homeUrl } from "@/lib/site";

type Status = "loading" | "ready" | "error";

const SHARE_TITLE = "My Delusion Level · Grade Delusion Student Edition";

/**
 * The 9:16 Instagram Story card. The image is drawn once, when the result appears, so a tap on "Share" can call the
 * Web Share API immediately (it must happen inside the tap, before any awaiting). The IMAGE is what gets shared;
 * the website link is only supporting text. Where files can't be shared: download, long-press save, and (clearly
 * labelled link-only) WhatsApp / Telegram links. No app is promised: the share sheet decides what is available.
 */
export default function StoryCard({ data }: { data: CardData }) {
  const [status, setStatus] = useState<Status>("loading");
  const [image, setImage] = useState<RenderedImage | null>(null);
  const [message, setMessage] = useState("");
  const text = shareText(data);
  // Telegram adds the url itself; keeping it in the text too would show the link twice.
  const telegramHref = telegramUrl(text.replace(homeUrl, "").trim(), homeUrl);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setImage(null);
    renderCard(data)
      .then((img) => {
        if (cancelled) return;
        setImage(img);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [data.pct, data.rank, data.diagnosis]); // eslint-disable-line react-hooks/exhaustive-deps -- `data` is rebuilt every render; its fields are the real dependencies

  const file =
    image?.blob && typeof File !== "undefined" ? new File([image.blob], "grade-delusion-story.png", { type: "image/png" }) : null;
  const canShareFile = !!file && typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

  // Called synchronously from the tap: no await before navigator.share(), or iOS Safari drops the user gesture.
  const share = () => {
    if (!file || !canShareFile) return;
    setMessage("");
    navigator
      .share({ files: [file], title: SHARE_TITLE, text })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return; // the visitor closed the share sheet
        setMessage("Sharing the image didn’t work on this device. Download the image and upload it yourself.");
      });
  };

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border-[3px] border-ink bg-ink/5 shadow-[8px_8px_0_var(--ink)]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- a data URL made in this browser; an <img> can be long-pressed and saved
          <img
            src={image.dataUrl}
            alt={`Instagram Story card: Delusion Level ${data.pct}%, ${data.rank}. ${data.diagnosis}`}
            className="size-full object-cover"
          />
        ) : (
          <p className="grid size-full place-items-center p-6 text-center font-bold" role="status">
            {status === "error" ? "Your browser couldn’t draw the card, so there’s no image to share this time." : "Printing your card…"}
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-3">
        {canShareFile && (
          <button type="button" onClick={share} className="brutal-btn justify-center bg-hot text-lg">
            Share My Delusion <span aria-hidden>📸</span>
          </button>
        )}
        {image && (
          <a href={image.dataUrl} download="grade-delusion-story-card.png" className={canShareFile ? "brutal-btn justify-center bg-sun" : "brutal-btn justify-center bg-hot"}>
            Download Image <span aria-hidden>⬇</span>
          </a>
        )}
      </div>

      {status === "ready" && canShareFile && (
        <p className="mt-3 text-center text-xs text-ink/70">
          Opens your device’s share sheet with the image attached. Which apps appear depends on your device, browser and the apps you have installed.
        </p>
      )}

      {status === "ready" && !canShareFile && (
        <div className="mt-4 rounded-xl border-[3px] border-ink bg-paper p-3 text-sm" role="note">
          <p className="font-bold">This browser can’t attach the image to a share sheet.</p>
          <p className="mt-1 text-ink/80">
            Download the image (or press and hold it, then tap Save), then upload it manually to Instagram, Facebook, WhatsApp, Telegram or any app you like. In-app browsers, such as the one inside Instagram, often can’t share images directly.
          </p>
          <p className="mt-2 text-ink/80">
            Link only, no image:{" "}
            <a href={whatsappUrl(text)} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">
              WhatsApp
            </a>
            {" · "}
            <a href={telegramHref} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">
              Telegram
            </a>
          </p>
        </div>
      )}

      <p className="mt-3 text-center text-sm font-bold" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
