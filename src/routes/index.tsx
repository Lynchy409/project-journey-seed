import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Journey" },
      {
        name: "description",
        content: "My Journey — a personal project. Coming soon.",
      },
      { property: "og:title", content: "My Journey" },
      {
        property: "og:description",
        content: "My Journey — a personal project. Coming soon.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          My Journey
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This project is being set up. More to come soon.
        </p>
      </div>
    </div>
  );
}
