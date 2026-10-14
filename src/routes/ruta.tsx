import { createFileRoute, useRouter } from "@tanstack/react-router";
import { RutaGame } from "@/components/app/RutaGame";

export const Route = createFileRoute("/ruta")({
  head: () => ({
    meta: [
      { title: "Ruta: Road to Fluent | My Journey" },
      { name: "description", content: "A Spanish adventure across Spain — create a traveller and earn XP." },
      { property: "og:title", content: "Ruta: Road to Fluent" },
      { property: "og:description", content: "A Spanish adventure across Spain — create a traveller and earn XP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RutaPage,
});

function RutaPage() {
  const router = useRouter();
  const goBack = () => {
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: "/learn" });
  };
  return (
    <div className="min-h-dvh bg-background">
      <RutaGame />
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
