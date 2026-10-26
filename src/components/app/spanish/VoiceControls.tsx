import { useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2 } from "lucide-react";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): (new () => Recognition) | undefined {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recognition) | undefined;
}

/** Browser speech-to-text (Spanish). Free, built into the browser; typing always remains available. */
export function VoiceInput({ onText, disabled }: { onText: (text: string) => void; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "listening" | "unsupported">("idle");
  const [note, setNote] = useState("");
  const rec = useRef<Recognition | null>(null);
  useEffect(() => {
    if (!getRecognition()) setState("unsupported");
    return () => rec.current?.abort();
  }, []);
  if (state === "unsupported")
    return (
      <p className="text-xs text-muted-foreground">
        Voice input isn't supported in this browser (try Chrome or Safari). Typing works as normal.
      </p>
    );
  function start() {
    const Ctor = getRecognition();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "es-ES";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) onText(text);
      setNote(text ? "Check the transcript, then send." : "Didn't catch that — try again.");
    };
    r.onerror = (e) => {
      setNote(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Microphone access was blocked. Allow it in your browser settings, or keep typing."
          : e.error === "no-speech"
            ? "No speech heard — try again."
            : "Voice input stopped. You can type instead.",
      );
    };
    r.onend = () => setState("idle");
    rec.current = r;
    setNote("Listening… speak in Spanish.");
    setState("listening");
    try {
      r.start();
    } catch {
      setState("idle");
      setNote("Couldn't start the microphone. You can type instead.");
    }
  }
  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (state === "listening" ? rec.current?.stop() : start())}
        className={`inline-flex min-h-12 items-center gap-2 rounded-2xl border px-4 text-sm font-bold ${
          state === "listening" ? "border-destructive bg-destructive/10 text-destructive" : "bg-card"
        }`}
      >
        {state === "listening" ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {state === "listening" ? "Stop recording" : "Speak your reply"}
      </button>
      {note && (
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  );
}

/** Reads Spanish text aloud with the device's built-in voice. */
export function SpeakButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    setSupported("speechSynthesis" in window);
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);
  if (!supported) return null;
  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-ES";
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("es"));
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={speaking ? "Stop audio" : "Play in Spanish"}
      className="inline-flex min-h-10 items-center gap-1 rounded-xl border bg-card px-3 text-xs font-bold"
    >
      {speaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}
