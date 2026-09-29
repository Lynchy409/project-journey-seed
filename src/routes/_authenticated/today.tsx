import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Card, ProfileButton } from "@/components/app/AppShell";
import { MomentumRing } from "@/components/app/MomentumRing";
import { profileQuery } from "@/lib/profile";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({ meta: [{ title: "Today — My Journey" }] }),
  component: Today,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Today() {
  const { data: p } = useQuery(profileQuery);
  const first = p?.display_name?.split(" ")[0];
  return (
    <AppShell eyebrow={greeting()} title={first ?? "Today"} right={<ProfileButton name={p?.display_name} avatar={p?.avatar_url} />}>
      <Card className="flex items-center gap-5">
        <MomentumRing value={50} />
        <div>
          <p className="text-lg font-extrabold">Let's build momentum</p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">Your daily tasks and score arrive in Phase 2.</p>
        </div>
      </Card>
    </AppShell>
  );
}
