import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/corre")({
  head: () => ({
    meta: [
      { title: "¡Corre! — Spanish game | My Journey" },
      { name: "description", content: "Play ¡Corre!, a fast Spanish learning game." },
      { property: "og:title", content: "¡Corre! — Spanish game" },
      { property: "og:description", content: "Play ¡Corre!, a fast Spanish learning game." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CorrePage,
});

function CorrePage() {
  const router = useRouter();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      ho: html.style.overflow, hb: html.style.overscrollBehavior,
      bo: body.style.overflow, bb: body.style.overscrollBehavior,
      bm: body.style.margin, bt: body.style.touchAction,
    };
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.margin = "0";
    body.style.touchAction = "none";
    return () => {
      html.style.overflow = prev.ho;
      html.style.overscrollBehavior = prev.hb;
      body.style.overflow = prev.bo;
      body.style.overscrollBehavior = prev.bb;
      body.style.margin = prev.bm;
      body.style.touchAction = prev.bt;
    };
  }, []);

  const goBack = () => {
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: "/today" });
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      <iframe
        src="/corre.html"
        title="¡Corre!"
        style={{ width: "100dvw", height: "100dvh", border: 0, margin: 0, display: "block" }}
        allow="autoplay; fullscreen"
      />
      <button
        type="button"
        onClick={goBack}
        className="fixed bottom-3 left-3 z-50 rounded-full bg-foreground/40 px-3 py-1.5 text-xs font-semibold text-background backdrop-blur"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        ← Back
      </button>
    </div>
  );
}
