export type Move = {
  key: "diamond" | "wgs" | "hips" | "dog" | "ragdoll" | "squat";
  name: string;
  target: string;
  seconds: number;
  /** Prompt a side switch halfway through. */
  sides?: boolean;
  cues: string[];
  tip: string;
};

/** The 6-minute morning mobility flow: hips, lower back, hamstrings. */
export const MORNING_FLOW: Move[] = [
  {
    key: "diamond",
    name: "DDP diamond cutter & reach",
    target: "Lower back & spine",
    seconds: 60,
    cues: [
      "Thumbs and index fingers form a diamond overhead.",
      "Inhale, sweep wide, then hinge the hips back and reach long.",
    ],
    tip: "Squeeze the glutes and draw the belly button in at the top so the bend stays in your mid-back, never pinching the lumbar. Level up: pause 3 seconds at the 90° hinge with arms past your ears.",
  },
  {
    key: "wgs",
    name: "World's greatest stretch",
    target: "Hip flexors & T-spine",
    seconds: 60,
    sides: true,
    cues: [
      "Long runner's lunge, inside elbow drops toward the ankle.",
      "Rotate and reach the top hand to the ceiling, eyes follow.",
    ],
    tip: "Squeeze the rear glute hard to force the front hip flexor open. Level up: hover the back knee an inch off the floor the whole time.",
  },
  {
    key: "hips",
    name: "90/90 hip flow to shin box",
    target: "Hips & glutes",
    seconds: 60,
    sides: true,
    cues: [
      "Front leg 90°, back leg 90°, sit tall without slumping.",
      "Lean the sternum over the front shin, breathe, then swivel.",
    ],
    tip: "Never round the lower back to get lower — keep the chest proud like you're showing a logo. Level up: switch sides without touching your hands down.",
  },
  {
    key: "dog",
    name: "Down dog hamstring & calf pedal",
    target: "Hamstrings & calves",
    seconds: 60,
    cues: [
      "Push the floor away, drive hips high, chest toward thighs.",
      "Alternate pressing each heel down for 2-second holds.",
    ],
    tip: "Bend the knees first to get the spine dead straight and tailbone to the ceiling, then straighten the legs. Level up: lift one leg into a three-legged dog and pulse the standing heel.",
  },
  {
    key: "ragdoll",
    name: "Ragdoll fold & hamstring floss",
    target: "Hamstrings & lower back",
    seconds: 60,
    cues: [
      "Hang heavy over the thighs, knees soft, neck fully released.",
      "Sway gently, then straighten one knee at a time.",
    ],
    tip: "Grip the floor with your toes and shift weight into the balls of your feet instead of sitting back on the heels — the hamstrings and lower back let go instantly.",
  },
  {
    key: "squat",
    name: "Deep primal squat pry",
    target: "Hips & ankles",
    seconds: 60,
    cues: [
      "Drop to your deepest squat, elbows wedged inside the knees.",
      "Breathe into the belly, pry the hips open, then stand tall.",
    ],
    tip: "Keep both heels glued to the floor. Level up: from the bottom, reach one arm straight overhead without letting the opposite knee cave in, then switch.",
  },
];

export const FLOW_SECONDS = MORNING_FLOW.reduce((s, m) => s + m.seconds, 0);

/** The three-line morning anchor read before the day starts. */
export const PRAYER_LINES = [
  "Thank you for the breath in my lungs, the health in my body, and the opportunity of this new day.",
  "Give me the discipline to control only what is mine to control, the clarity to see things as they are, and the patience to wait for what is right.",
  "Today I will execute with discipline, compete with heart, and let my actions reflect my goals.",
];

/** Short beep for hands-free transitions. Silent if audio is unavailable. */
export function beep(kind: "tick" | "switch" | "next" = "tick") {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = kind === "next" ? 880 : kind === "switch" ? 660 : 520;
    const dur = kind === "tick" ? 0.12 : 0.35;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
    osc.onended = () => void ctx.close();
  } catch {
    /* no audio, no problem */
  }
}
