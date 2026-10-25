import { useLayoutEffect, useRef, useState } from "react";
import { Card } from "../AppShell";
import { GhostButton, PrimaryButton } from "../ui";
import { findSpanish, itemData, SPANISH_SOURCES } from "@/lib/spanish";
import type { ListeningProgress, SpanishItem } from "@/lib/spanish-types";
import { addPlayedRange, coveredSeconds, playedDelta, type PlayedRange } from "@/lib/spanish-audio";

type Sound = { id: number; title: string; duration: number };
type Progress = { currentPosition: number };
type Widget = {
  bind: (event: string, handler: (data?: Progress) => void) => void;
  unbind: (event: string) => void;
  getSounds: (callback: (sounds: Sound[]) => void) => void;
  getCurrentSoundIndex: (callback: (index: number) => void) => void;
  getCurrentSound: (callback: (sound: Sound) => void) => void;
  getPosition: (callback: (position: number) => void) => void;
  seekTo: (ms: number) => void;
  skip: (index: number) => void;
  pause: () => void;
};
declare global {
  interface Window {
    SC?: {
      Widget: ((element: HTMLIFrameElement) => Widget) & {
        Events: {
          READY: string;
          PLAY: string;
          PLAY_PROGRESS: string;
          SEEK: string;
          PAUSE: string;
          FINISH: string;
          ERROR: string;
        };
      };
    };
  }
}
let widgetScript: Promise<void> | undefined;
function loadWidgetScript() {
  if (window.SC?.Widget) return Promise.resolve();
  widgetScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.onload = () => resolve();
    script.onerror = () => {
      widgetScript = undefined;
      script.remove();
      reject(
        new Error(
          "SoundCloud's player could not load. Check your connection or open the official course.",
        ),
      );
    };
    document.head.appendChild(script);
  });
  return widgetScript;
}
export function LanguageTransferPlayer({
  items,
  startLesson,
  onSave,
  onListeningSeconds,
  onError,
}: {
  items: SpanishItem[];
  startLesson: number;
  onSave: (key: string, progress: ListeningProgress) => Promise<SpanishItem>;
  onListeningSeconds: (seconds: number) => void;
  onError: (message: string) => void;
}) {
  const [consent, setConsent] = useState(false);
  const [ready, setReady] = useState(false);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [active, setActive] = useState<Sound | null>(null);
  const [counted, setCounted] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const api = useRef<Widget | null>(null);
  const latest = useRef({ items, onSave, onError, onListeningSeconds });
  const saveQueue = useRef(Promise.resolve());
  latest.current = { items, onSave, onError, onListeningSeconds };
  const clock = useRef({
    sound: null as Sound | null,
    index: 0,
    playing: false,
    position: 0,
    last: 0,
    session: 0,
    trackSeconds: 0,
    ranges: [] as PlayedRange[],
    savedAt: 0,
    base: null as ListeningProgress | null,
    seek: null as { index: number; ms: number } | null,
  });
  const previous = items
    .filter((item) => item.kind === "listening")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const resume = previous ? itemData<ListeningProgress>(previous) : null;
  const courseHistory = items
    .filter((item) => item.kind === "listening")
    .map((item) => itemData<ListeningProgress>(item))
    .sort((a, b) => a.index - b.index);
  const completedTracks = courseHistory.filter((entry) => entry.completed).length;
  const totalSeconds = courseHistory.reduce((sum, entry) => sum + entry.played_seconds, 0);
  useLayoutEffect(() => {
    if (!consent || !frame.current) return;
    let disposed = false;
    let timeout: ReturnType<typeof setTimeout>;
    let widget: Widget | null = null;
    const events: string[] = [];
    const playbackState = clock.current;
    const flush = async (completed = false) => {
      const state = clock.current;
      if (!state.sound) return;
      const key = String(state.sound.id);
      const base = state.base;
      const data: ListeningProgress = {
        track_id: state.sound.id,
        index: state.index,
        title: state.sound.title,
        position_ms: state.position,
        duration_ms: state.sound.duration,
        played_seconds: (base?.played_seconds ?? 0) + state.trackSeconds,
        listened_ranges: state.ranges.map((range) => [...range]),
        completed:
          base?.completed ||
          (completed && coveredSeconds(state.ranges) >= (state.sound.duration / 1000) * 0.8) ||
          false,
      };
      state.savedAt = performance.now();
      saveQueue.current = saveQueue.current
        .then(async () => {
          const cached = findSpanish(latest.current.items, "listening", key);
          const old = cached ? itemData<ListeningProgress>(cached) : null;
          await latest.current.onSave(key, {
            ...data,
            completed: data.completed || old?.completed || false,
            played_seconds: Math.max(data.played_seconds, old?.played_seconds ?? 0),
          });
        })
        .catch((error: unknown) => {
          latest.current.onError(
            error instanceof Error
              ? error.message
              : "Playback position was not saved. Reload before continuing on another device.",
          );
        });
      await saveQueue.current;
    };
    const initialise = async () => {
      try {
        await loadWidgetScript();
        if (disposed || !frame.current || !window.SC) return;
        widget = window.SC.Widget(frame.current);
        api.current = widget;
        const E = window.SC.Widget.Events;
        const bind = (event: string, handler: (data?: Progress) => void) => {
          events.push(event);
          widget!.bind(event, handler);
        };
        timeout = setTimeout(() => {
          if (!disposed)
            latest.current.onError(
              "The official player has not become ready. It may be blocked in this browser. Use the official course link; external progress is manual.",
            );
        }, 20000);
        bind(E.READY, () => {
          clearTimeout(timeout);
          if (disposed) return;
          setReady(true);
          widget!.getSounds((list) => {
            if (!disposed) setSounds(list);
          });
        });
        bind(E.PLAY, () => {
          void flush();
          clock.current.playing = false;
          widget!.getCurrentSoundIndex((index) =>
            widget!.getCurrentSound((sound) => {
              if (disposed || !sound) return;
              const state = clock.current;
              if (state.sound?.id !== sound.id) {
                state.trackSeconds = 0;
                const old = findSpanish(latest.current.items, "listening", String(sound.id));
                state.base = old ? itemData<ListeningProgress>(old) : null;
                state.ranges = (state.base?.listened_ranges ?? []).map((range) => [...range]);
              }
              state.sound = sound;
              state.index = index;
              state.last = performance.now();
              state.playing = true;
              setActive(sound);
              if (state.seek?.index === index) {
                widget!.seekTo(state.seek.ms);
                state.position = state.seek.ms;
                state.seek = null;
              } else
                widget!.getPosition((position) => {
                  state.position = position;
                  state.last = performance.now();
                });
            }),
          );
        });
        bind(E.PLAY_PROGRESS, (data) => {
          if (!data || disposed) return;
          const state = clock.current;
          const now = performance.now();
          const delta = playedDelta(
            state.position,
            data.currentPosition,
            now - state.last,
            state.playing,
          );
          if (delta > 0)
            state.ranges = addPlayedRange(
              state.ranges,
              data.currentPosition - delta * 1000,
              Math.min(data.currentPosition, state.sound?.duration ?? data.currentPosition),
            );
          state.trackSeconds += delta;
          state.session += delta;
          state.position = data.currentPosition;
          state.last = now;
          setCounted(state.session);
          latest.current.onListeningSeconds(Math.floor(state.session));
          if (now - state.savedAt > 15000) void flush();
        });
        bind(E.SEEK, (data) => {
          clock.current.position = data?.currentPosition ?? clock.current.position;
          clock.current.last = performance.now();
          void flush();
        });
        bind(E.PAUSE, () => {
          clock.current.playing = false;
          void flush();
        });
        bind(E.FINISH, () => {
          clock.current.playing = false;
          void flush(true);
        });
        bind(E.ERROR, () => {
          clock.current.playing = false;
          latest.current.onError(
            "SoundCloud reported a playback error. No further listening time is being counted.",
          );
        });
      } catch (error) {
        latest.current.onError(
          error instanceof Error ? error.message : "The official player is unavailable.",
        );
      }
    };
    void initialise();
    return () => {
      disposed = true;
      clearTimeout(timeout);
      playbackState.playing = false;
      void flush();
      // The SDK unbinds by postMessage. In a passive effect React may already have
      // detached the iframe, making contentWindow null and crashing the route.
      // Layout cleanup runs before removal; the guard also tolerates provider teardown.
      for (const event of events) {
        try {
          widget?.unbind(event);
        } catch {
          /* iframe was already detached by the provider */
        }
      }
      api.current = null;
    };
  }, [consent]);
  const selectedIndex = resume
    ? resume.completed
      ? resume.index + 1
      : resume.index
    : Math.max(0, startLesson - 1);
  return (
    <Card>
      <h2 className="text-lg font-extrabold">Language Transfer, inside Journey</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Official SoundCloud course player. Audio stays with Language Transfer/SoundCloud; it is not
        copied. This tracks Journey listening only, not progress in the separate LT app.
      </p>
      <p className="mt-3 rounded-2xl bg-secondary p-3 text-sm">
        {completedTracks} playback-covered lessons · {Math.round(totalSeconds / 6) / 10} recorded
        listening minutes in Journey. Listening coverage is not a comprehension score.
      </p>
      {!!courseHistory.length && (
        <details className="mt-3 text-sm">
          <summary className="min-h-11 cursor-pointer font-bold">Saved course progress</summary>
          <ul className="space-y-2">
            {courseHistory.map((entry) => (
              <li key={entry.track_id} className="rounded-xl border p-3">
                <p className="font-bold">{entry.title}</p>
                <p className="mt-1 text-muted-foreground">
                  {entry.completed
                    ? "Playback coverage complete"
                    : `Resume at ${Math.floor(entry.position_ms / 60000)}:${String(Math.floor(entry.position_ms / 1000) % 60).padStart(2, "0")}`}{" "}
                  · {Math.round(entry.played_seconds / 6) / 10} recorded min
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
      {startLesson > 1 && (
        <p className="mt-2 text-sm">
          Lessons 1–{startLesson - 1}: previously covered, self-reported in your starting-point
          settings.
        </p>
      )}
      {!consent ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            Loading the player connects your browser to SoundCloud and its third-party storage.
            Playback starts only when you choose it.
          </p>
          <PrimaryButton onClick={() => setConsent(true)}>
            Load official course player
          </PrimaryButton>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <iframe
            ref={frame}
            title="Official Language Transfer Complete Spanish SoundCloud player"
            className="h-80 w-full rounded-2xl border"
            allow="autoplay; encrypted-media"
            src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/45266314&color=%232c3547&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=true"
          />
          <GhostButton
            disabled={!ready || !sounds.length}
            onClick={() => {
              const index = Math.min(sounds.length - 1, selectedIndex);
              clock.current.seek = {
                index,
                ms: resume && resume.index === index && !resume.completed ? resume.position_ms : 0,
              };
              api.current?.skip(index);
            }}
          >
            {resume && !resume.completed
              ? `Resume lesson ${resume.index + 1} at ${Math.floor(resume.position_ms / 60000)}:${String(Math.floor(resume.position_ms / 1000) % 60).padStart(2, "0")}`
              : `Play lesson ${sounds.length ? Math.min(sounds.length, selectedIndex + 1) : selectedIndex + 1}`}
          </GhostButton>
          <p aria-live="polite" className="text-sm">
            {active?.title ??
              (ready
                ? `${sounds.length} official tracks available`
                : "Loading official player…")}{" "}
            · {Math.floor(counted)} seconds of playback counted this session
          </p>
          <p className="text-xs text-muted-foreground">
            Position is saved about every 15 seconds and when paused. Seeking does not count as
            listening. A “played” completion requires at least 80% of distinct audio covered, not
            repeated loops or just reaching the end; this is not proof of comprehension.
          </p>
        </div>
      )}
      <a
        className="mt-3 inline-flex min-h-11 items-center text-sm font-bold underline"
        href={SPANISH_SOURCES.lt}
        target="_blank"
        rel="noreferrer"
      >
        Open the official Language Transfer course
      </a>
    </Card>
  );
}
