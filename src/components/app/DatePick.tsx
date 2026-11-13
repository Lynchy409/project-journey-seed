import { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { daysLeft } from "@/lib/campaign";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plus = (days: number, months = 0) => { const d = new Date(); d.setMonth(d.getMonth() + months); d.setDate(d.getDate() + days); return iso(d); };

/** Tap-to-open in-app calendar (inline so drawers can't block it) with quick picks. */
export function DatePick({ value, onChange, max = null }: { value: string; onChange: (v: string) => void; max?: string | null }) {
  const [open, setOpen] = useState(false);
  const left = daysLeft(value || null);
  const sel = value ? new Date(value + "T00:00:00") : undefined;
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(!open)} className="flex min-h-12 flex-1 items-center gap-2 rounded-2xl border-2 bg-card px-4 text-left text-sm font-bold">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          {sel ? sel.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : <span className="text-muted-foreground">Pick completion date</span>}
        </button>
        {value && <button type="button" aria-label="Clear date" onClick={() => onChange("")} className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 bg-card"><X className="h-4 w-4" /></button>}
      </div>
      {left !== null && <p className="text-xs font-extrabold text-muted-foreground">{left < 0 ? "Date has passed" : `${left} days to completion`}</p>}
      <div className="flex flex-wrap gap-1.5">
        {max && <p className="w-full text-xs font-bold text-muted-foreground">Must be by {new Date(max + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} (main goal date)</p>}
        {([["+2 wks", 14, 0], ["+1 mo", 0, 1], ["+3 mo", 0, 3], ["+6 mo", 0, 6], ["+1 yr", 0, 12]] as const).filter(([, d, m]) => !max || plus(d, m) <= max).map(([l, d, m]) => (
          <button key={l} type="button" onClick={() => { onChange(plus(d, m)); setOpen(false); }} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold">{l}</button>
        ))}
      </div>
      {open && (
        <div className="pointer-events-auto rounded-2xl border bg-card" data-vaul-no-drag>
          <Calendar mode="single" selected={sel} {...(sel ? { defaultMonth: sel } : {})} {...(max ? { disabled: { after: new Date(max + "T00:00:00") } } : {})} onSelect={(d) => { if (d) { onChange(iso(d)); setOpen(false); } }} className="pointer-events-auto p-3" />
        </div>
      )}
    </div>
  );
}
