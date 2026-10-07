// Ted — a slightly tubby caramel cockapoo, top-down-ish cartoon.
export function Ted({ facing = 1, className = "" }: { facing?: 1 | -1; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ transform: `scaleX(${facing})` }} aria-label="Ted">
      <ellipse cx="50" cy="88" rx="30" ry="6" fill="rgba(0,0,0,0.18)" />
      {/* chubby body */}
      <ellipse cx="46" cy="64" rx="30" ry="22" fill="#C98A4B" />
      <ellipse cx="46" cy="70" rx="20" ry="12" fill="#E0AE77" />
      {/* legs */}
      <rect x="24" y="76" width="9" height="12" rx="4" fill="#B07438" />
      <rect x="54" y="76" width="9" height="12" rx="4" fill="#B07438" />
      {/* tail */}
      <circle cx="16" cy="54" r="7" fill="#C98A4B" />
      {/* head */}
      <circle cx="70" cy="40" r="20" fill="#D49A5C" />
      <circle cx="66" cy="24" r="8" fill="#C98A4B" />
      <circle cx="76" cy="23" r="7" fill="#C98A4B" />
      {/* floppy ears */}
      <ellipse cx="54" cy="44" rx="8" ry="15" fill="#A86A30" />
      <ellipse cx="86" cy="44" rx="7" ry="13" fill="#A86A30" />
      {/* face */}
      <ellipse cx="74" cy="48" rx="9" ry="7" fill="#E7BC8A" />
      <circle cx="64" cy="38" r="3" fill="#2B1A0E" />
      <circle cx="78" cy="38" r="3" fill="#2B1A0E" />
      <circle cx="65" cy="37" r="1" fill="#fff" />
      <circle cx="79" cy="37" r="1" fill="#fff" />
      <ellipse cx="74" cy="46" rx="3.5" ry="2.5" fill="#2B1A0E" />
      <path d="M70 51 Q74 55 78 51" stroke="#2B1A0E" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Guard({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-label="Guard">
      <circle cx="50" cy="56" r="34" fill="#334155" />
      <rect x="22" y="22" width="56" height="18" rx="6" fill="#1E293B" />
      <rect x="16" y="36" width="68" height="6" rx="3" fill="#0F172A" />
      <circle cx="50" cy="30" r="4" fill="#FACC15" />
      <circle cx="38" cy="58" r="5" fill="#fff" />
      <circle cx="62" cy="58" r="5" fill="#fff" />
      <circle cx="38" cy="58" r="2.5" fill="#0F172A" />
      <circle cx="62" cy="58" r="2.5" fill="#0F172A" />
      <path d="M38 74 L62 74" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
