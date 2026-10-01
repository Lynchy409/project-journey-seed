import { GraduationCap } from "lucide-react";
import { Field, TextArea } from "@/components/app/ui";

/** "Mark as a lesson" switch that unlocks a box for one clean rule sentence. */
export function LessonToggle({
  on,
  onToggle,
  value,
  onChange,
}: {
  on: boolean;
  onToggle: () => void;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left ${
          on ? "border-trading bg-trading-soft" : "border-dashed"
        }`}
      >
        <span className="flex items-center gap-2 text-sm font-bold">
          <GraduationCap className={`h-5 w-5 ${on ? "text-trading" : "text-muted-foreground"}`} />
          Mark as a lesson
        </span>
        <span className={`text-xs font-extrabold uppercase ${on ? "text-trading" : "text-muted-foreground"}`}>
          {on ? "On" : "Off"}
        </span>
      </button>
      {on && (
        <Field label="The lesson — one clean sentence">
          <TextArea value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g. Never enter before the 15m candle closes" />
        </Field>
      )}
    </>
  );
}
