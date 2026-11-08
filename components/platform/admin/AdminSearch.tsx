import Icon from "../Icon";

/** A GET search form for admin lists. Hidden fields keep the other filters when you search. */
export default function AdminSearch({ action, q, placeholder, keep = {} }: { action: string; q?: string; placeholder: string; keep?: Record<string, string | undefined> }) {
  return (
    <form action={action} role="search" className="flex gap-2">
      <label htmlFor={`search-${action}`} className="sr-only">
        {placeholder}
      </label>
      <input id={`search-${action}`} name="q" type="search" defaultValue={q} placeholder={placeholder} maxLength={80} className="pf-input" />
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <button type="submit" className="pf-btn pf-btn-primary shrink-0">
        <Icon name="search" size={18} /> <span className="hidden sm:inline">Search</span>
        <span className="sr-only sm:hidden">Search</span>
      </button>
    </form>
  );
}

/** Build a querystring from only the filters that are set. */
export function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== 1 && v !== "all") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}
