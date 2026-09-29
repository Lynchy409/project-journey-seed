import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, NotebookPen, Briefcase, Dumbbell, CandlestickChart, BookOpen, Scale } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

const ITEMS = [
  { label: "Journal", icon: NotebookPen, cls: "bg-life-soft text-life", to: "/journal" as const },
  { label: "Shift", icon: Briefcase, cls: "bg-secondary text-foreground", to: "/plan" as const },
  { label: "Workout", icon: Dumbbell, cls: "bg-fitness-soft text-fitness", to: "/train" as const },
  { label: "Trade", icon: CandlestickChart, cls: "bg-trading-soft text-trading", to: "/trade" as const },
  { label: "Learning", icon: BookOpen, cls: "bg-learning-soft text-learning", to: "/learn" as const },
  { label: "Weight", icon: Scale, cls: "bg-fitness-soft text-fitness", to: "/today" as const },
];

export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <>
      <button
        aria-label="Quick add"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float transition-transform active:scale-90 mb-[env(safe-area-inset-bottom)]"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-xl font-extrabold">Quick add</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-3 gap-3 px-4 pb-8">
            {ITEMS.map(({ label, icon: Icon, cls, to }) => (
              <button
                key={label}
                onClick={() => {
                  setOpen(false);
                  navigate({ to });
                }}
                className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 font-semibold active:scale-95 transition-transform"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${cls}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
