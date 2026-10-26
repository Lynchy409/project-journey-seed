import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { spanishAISetup } from "@/lib/spanish.functions";
import { requestSpanishAI } from "@/lib/spanish-client";
import { Card } from "../AppShell";
import { GhostButton, PrimaryButton } from "../ui";

export function SpanishConnectionChecks() {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState("");
  async function check(ai: boolean) {
    setBusy(true);
    const lines = [`Spanish connection check • ${new Date().toISOString()}`];
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        lines.push("Sign-in: missing. Sign into Journey before checking Spanish.");
        return;
      }
      lines.push("Sign-in: present (server authentication checked separately below).");
      for (const table of ["spanish_items", "spanish_activities"] as const) {
        const { error } = await supabase.from(table).select("id").limit(1);
        lines.push(
          error
            ? `${table}: NOT READABLE (${error.code ?? "connection"}). ${error.message}`
            : `${table}: readable. This does not by itself prove saving or owner security.`,
        );
      }
      try {
        const setup = await spanishAISetup({ signal: AbortSignal.timeout(15000) });
        lines.push(
          `Server authentication: passed. AI key: ${setup.configured ? "configured" : "missing"}.`,
        );
        lines.push(`Tutor model: ${setup.model}. Review model: ${setup.reviewModel}.`);
        if (ai && setup.configured) {
          const response = await requestSpanishAI({
            data: {
              mode: "opening",
              message: "",
              topic:
                "Ask one natural Spanish question about a recent weekend. This is a connection test, not a lesson record.",
              variety: "Respect valid Spanish regional alternatives.",
              history: [],
            },
          });
          lines.push("Real AI request and second-pass format checks: passed.");
          lines.push(`Test question: ${response.response}`);
          lines.push(
            "This is a connection test, not expert verification. No lesson, mistake or completion was saved.",
          );
        } else {
          lines.push(
            "AI runtime balance and real answers: NOT TESTED. Setup checks do not make a model call.",
          );
        }
      } catch (error) {
        lines.push(
          error instanceof Error
            ? `AI/server check: ${error.message}`
            : "AI/server check failed. No completion was recorded.",
        );
      }
    } catch {
      lines.push("Connection check failed. Check your network and refresh Journey.");
    } finally {
      setReport(lines.join("\n"));
      setBusy(false);
    }
  }
  return (
    <details className="mb-4 rounded-2xl border bg-card p-4">
      <summary className="min-h-11 cursor-pointer text-sm font-bold">
        Spanish not working? Check the connection
      </summary>
      <Card className="mt-2 !border-0 !p-0 !shadow-none">
        <p className="text-sm text-muted-foreground">
          Check the database and server setup here, without running SQL or changing your records.
          The setup check does not call an AI model.
        </p>
        <GhostButton disabled={busy} onClick={() => void check(false)}>
          {busy ? "Checking…" : "Check setup without an AI request"}
        </GhostButton>
        <p className="mt-2 text-xs text-muted-foreground">
          The optional AI test sends a generic question through the app's AI service and its review
          pass. It uses runtime AI credits if available; it does not buy credits or use Lovable
          chat.
        </p>
        <PrimaryButton disabled={busy} onClick={() => void check(true)}>
          Test the real AI connection
        </PrimaryButton>
        {report && (
          <pre
            aria-live="polite"
            className="mt-3 select-text whitespace-pre-wrap break-words rounded-xl bg-secondary p-3 text-xs [overflow-wrap:anywhere]"
          >
            {report}
          </pre>
        )}
      </Card>
    </details>
  );
}
