import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Field, PrimaryButton, TextInput } from "@/components/app/ui";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — My Journey" },
      { name: "description", content: "Sign in to My Journey to plan your day, log your training, trades and learning." },
      { property: "og:title", content: "Sign in — My Journey" },
      { property: "og:description", content: "Sign in to My Journey to plan your day, log your training, trades and learning." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/today", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/today", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/today` },
        });
        if (error) throw error;
        toast.success("Account created. Check your email if confirmation is needed.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),3rem)]">
      <div className="absolute inset-x-0 top-0 h-2 bg-hero" />
      <div className="mx-auto w-full max-w-md flex-1">
        <h1 className="text-4xl font-extrabold tracking-tight">My Journey</h1>
        <p className="mt-2 text-base font-semibold text-muted-foreground">
          Plan the day you actually have. Then execute it.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-3">
          <Field label="Email">
            <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Password">
            <TextInput
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
            />
          </Field>
          <PrimaryButton type="submit" disabled={busy}>
            {mode === "up" ? "Create account" : "Sign in"}
          </PrimaryButton>
        </form>

        <button
          onClick={google}
          className="mt-3 h-14 w-full rounded-3xl border bg-card text-base font-extrabold active:scale-[0.98] transition-transform"
        >
          Continue with Google
        </button>

        <button
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="mt-6 w-full text-sm font-bold text-muted-foreground"
        >
          {mode === "in" ? "No account yet? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
