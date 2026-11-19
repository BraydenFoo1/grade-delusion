"use client";

import { useId, useState } from "react";
import { cleanName, renderCertificate, type RenderedImage } from "@/lib/share-card";
import { EXCUSES, excuseById, formatIssueDate } from "@/lib/toys";

/** Draws the spoof certificate in the browser. The name is never stored or sent anywhere. */
export default function CertificateGenerator() {
  const [name, setName] = useState("");
  const [excuseId, setExcuseId] = useState(EXCUSES[0].id);
  const [image, setImage] = useState<RenderedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const nameId = useId();
  const excuseSelectId = useId();

  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      setImage(await renderCertificate({ name: cleanName(name), excuse: excuseById(excuseId).text, issuedOn: formatIssueDate(new Date()) }));
    } catch {
      setError("Your browser couldn’t draw the certificate. Try another browser.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="grid gap-4">
        <div>
          <label htmlFor={nameId} className="text-sm font-bold uppercase tracking-wide">
            Name or nickname <span className="font-normal normal-case text-ink/60">(a nickname is safer than your real name)</span>
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            maxLength={30}
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Last-Minute Larry"
            className="mt-2 w-full rounded-xl border-[3px] border-ink bg-paper px-4 py-3 text-base font-bold"
          />
        </div>
        <div>
          <label htmlFor={excuseSelectId} className="text-sm font-bold uppercase tracking-wide">
            Pick your excuse
          </label>
          <select
            id={excuseSelectId}
            value={excuseId}
            onChange={(e) => setExcuseId(e.target.value)}
            className="mt-2 w-full rounded-xl border-[3px] border-ink bg-paper px-4 py-3 text-base font-bold"
          >
            {EXCUSES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.text}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={generate} disabled={busy} className="brutal-btn justify-center bg-hot">
          {busy ? "Printing…" : image ? "Regenerate certificate" : "Generate certificate"} <span aria-hidden>📜</span>
        </button>
      </div>

      <div role="status" aria-live="polite">
        {error && <p className="mt-4 rounded-xl border-[3px] border-ink bg-hot/20 p-3 text-sm font-bold">{error}</p>}
      </div>

      {image && (
        <div className="mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made in this browser */}
          <img
            src={image.dataUrl}
            alt={`Certificate of Delusion for ${cleanName(name)}: “${excuseById(excuseId).text}”`}
            className="w-full rounded-xl border-[3px] border-ink shadow-[6px_6px_0_var(--ink)]"
          />
          <a href={image.dataUrl} download="certificate-of-delusion.png" className="brutal-btn mt-4 w-full justify-center bg-sun">
            Download certificate <span aria-hidden>⬇</span>
          </a>
          <p className="mt-2 text-center text-xs text-ink/60">On iPhone or in an in-app browser? Press and hold the image, then tap Save.</p>
        </div>
      )}
    </div>
  );
}
