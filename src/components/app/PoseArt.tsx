import type { Move } from "@/lib/morning";

/**
 * Clean line-art pose diagrams — readable from the floor at arm's length.
 * Stroke uses currentColor so the parent controls the tone.
 */
export function PoseArt({ pose, className = "" }: { pose: Move["key"]; className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="10" y1="132" x2="190" y2="132" strokeWidth={3} opacity={0.25} />
      {pose === "diamond" && (
        <g>
          <circle cx="86" cy="36" r="11" />
          <path d="M86 47 L94 88" />
          <path d="M94 88 L86 132 M94 88 L112 130" />
          <path d="M86 52 L64 26 L86 14 L108 26 Z" strokeWidth={4} />
        </g>
      )}
      {pose === "wgs" && (
        <g>
          <circle cx="74" cy="34" r="11" />
          <path d="M74 45 L86 76" />
          <path d="M86 76 L58 110 L58 132" />
          <path d="M86 76 L134 116 L168 132" />
          <path d="M80 60 L60 86" />
          <path d="M80 60 L108 22" />
        </g>
      )}
      {pose === "hips" && (
        <g>
          <circle cx="80" cy="42" r="11" />
          <path d="M80 53 L86 88" />
          <path d="M86 88 L46 100 L52 132" />
          <path d="M86 88 L128 104 L164 96" />
          <path d="M82 66 L58 92" />
        </g>
      )}
      {pose === "dog" && (
        <g>
          <path d="M40 132 L100 34 L160 132" />
          <circle cx="82" cy="72" r="10" />
          <path d="M100 34 L100 22" strokeWidth={3} opacity={0.4} />
        </g>
      )}
      {pose === "ragdoll" && (
        <g>
          <path d="M96 20 L96 70" />
          <path d="M96 70 L84 132 M96 70 L112 132" />
          <path d="M96 30 L78 72 M96 30 L116 72" />
          <circle cx="96" cy="88" r="11" />
        </g>
      )}
      {pose === "squat" && (
        <g>
          <circle cx="92" cy="40" r="11" />
          <path d="M92 51 L96 84" />
          <path d="M96 84 L64 96 L70 132" />
          <path d="M96 84 L128 96 L122 132" />
          <path d="M94 66 L74 92 M94 66 L118 92" />
        </g>
      )}
    </svg>
  );
}
