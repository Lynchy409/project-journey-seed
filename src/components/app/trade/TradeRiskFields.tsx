import { Field, TextInput, SelectInput, GhostButton } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { TYPES, type SheetDetail } from "@/lib/trade-sheet";
export function TradeRiskFields({
  value: d,
  onChange: set,
}: {
  value: SheetDetail;
  onChange: (v: SheetDetail) => void;
}) {
  const update = (k: keyof SheetDetail, v: string) => set({ ...d, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Execution type">
          <TextInput
            list="sheet-types"
            value={d.execution}
            onChange={(e) => update("execution", e.target.value)}
          />
        </Field>
        <Field label="Lot size">
          <TextInput
            inputMode="decimal"
            value={d.lot}
            onChange={(e) => update("lot", e.target.value)}
          />
        </Field>
        <Field label="Out of TF">
          <TextInput value={d.outTf} onChange={(e) => update("outTf", e.target.value)} />
        </Field>
        <Field label="Out of type">
          <TextInput
            list="sheet-types"
            value={d.outType}
            onChange={(e) => update("outType", e.target.value)}
          />
        </Field>
        <Field label="Exit price">
          <TextInput
            inputMode="decimal"
            value={d.exit}
            onChange={(e) => update("exit", e.target.value)}
          />
        </Field>
        <Field label="Initial risk (£)">
          <TextInput
            inputMode="decimal"
            value={d.riskCash}
            onChange={(e) => update("riskCash", e.target.value)}
          />
        </Field>
      </div>
      <datalist id="sheet-types">
        {TYPES.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <Field label="Exit method">
        <SelectInput value={d.exitMode} onChange={(e) => set({ ...d, exitMode: e.target.value })}>
          <option value="full">Full exit</option>
          <option value="scaled">Partials</option>
          <option value="early">Early manual close</option>
        </SelectInput>
      </Field>
      {d.exitMode === "scaled" && (
        <div className="space-y-3">
          {d.fills.map((fill, i) => (
            <div key={i} className="border-b pb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Exit {i + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove exit ${i + 1}`}
                  onClick={() => set({ ...d, fills: d.fills.filter((_, j) => i !== j) })}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["percent", "price", "cash", "time"] as const).map((k) => (
                  <Field
                    key={k}
                    label={
                      {
                        percent: "% of original position",
                        price: "Exit price",
                        cash: "Net cash (£)",
                        time: "Exit time",
                      }[k]
                    }
                  >
                    <TextInput
                      type={k === "time" ? "time" : "text"}
                      inputMode={k === "time" ? "text" : "decimal"}
                      value={fill[k]}
                      onChange={(e) =>
                        set({
                          ...d,
                          fills: d.fills.map((f, j) =>
                            j === i ? { ...f, [k]: e.target.value } : f,
                          ),
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            </div>
          ))}
          <GhostButton
            onClick={() =>
              set({ ...d, fills: [...d.fills, { percent: "", price: "", cash: "", time: "" }] })
            }
          >
            <Plus className="inline size-4" /> Add partial exit
          </GhostButton>
        </div>
      )}
      <Field label="High-impact news within 2 hours of entry">
        <SelectInput value={d.nearNews} onChange={(e) => update("nearNews", e.target.value)}>
          <option value="">Unknown</option>
          <option value="Y">Yes</option>
          <option value="N">No</option>
        </SelectInput>
      </Field>
      <div className="flex flex-wrap gap-2">
        {["GBP", "USD", "EUR", "JPY"].map((c) => (
          <Button
            key={c}
            variant={d.currencies.includes(c) ? "default" : "outline"}
            className="min-h-12"
            aria-pressed={d.currencies.includes(c)}
            onClick={() =>
              set({
                ...d,
                currencies: d.currencies.includes(c)
                  ? d.currencies.filter((s) => s !== c)
                  : [...d.currencies, c],
              })
            }
          >
            {c}
          </Button>
        ))}
      </div>
      <Field label="What news">
        <TextInput value={d.newsText} onChange={(e) => update("newsText", e.target.value)} />
      </Field>
      <Field label="Followed my plan">
        <SelectInput
          value={d.followedPlan}
          onChange={(e) => update("followedPlan", e.target.value)}
        >
          <option value="">Not recorded</option>
          <option value="Y">Yes</option>
          <option value="N">No</option>
        </SelectInput>
      </Field>
    </div>
  );
}
