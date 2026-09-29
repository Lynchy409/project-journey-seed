import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { statementsQuery, profileQuery } from "@/lib/profile";
import { PILLARS, type Pillar } from "@/lib/pillars";

const KEY = "mj-switched-on";

/** Full-screen identity statement shown once per app open. */
export function SwitchOn() {
  const [show, setShow] = useState(false);
  const { data: profile } = useQuery(profileQuery);
  const { data: statements } = useQuery(statementsQuery);

  useEffect(() => {
    if (!sessionStorage.getItem(KEY)) setShow(true);
  }, []);

  if (!show || !statements || !profile || profile.show_switch_on === false) return null;
  const active = statements.filter((s) => s.active);
  if (active.length === 0) return null;
  const s = active[new Date().getDate() % active.length];
  const pillar = (s.pillar as Pillar) in PILLARS ? (s.pillar as Pillar) : "life";

  const close = () => {
    sessionStorage.setItem(KEY, "1");
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background px-6 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),2rem)] animate-in fade-in duration-500">
      <div className="absolute inset-x-0 top-0 h-2 bg-hero" />
      <div className="flex flex-1 flex-col justify-center">
        <span className={`mb-6 inline-flex w-fit rounded-full px-4 py-1.5 text-sm font-bold ${PILLARS[pillar].soft} ${PILLARS[pillar].text}`}>
          {PILLARS[pillar].label}
        </span>
        <p className="text-4xl font-extrabold leading-tight tracking-tight animate-in slide-in-from-bottom-4 duration-700">
          {s.text}
        </p>
        <p className="mt-6 text-base font-semibold text-muted-foreground">Say it out loud. Then go.</p>
      </div>
      <button
        onClick={close}
        className="h-16 w-full rounded-3xl bg-primary text-lg font-extrabold text-primary-foreground shadow-float active:scale-[0.98] transition-transform"
      >
        Let's go
      </button>
    </div>
  );
}
