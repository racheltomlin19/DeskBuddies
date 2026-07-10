const outline = "#704c35";

/**
 * Small sticker water fountain that Biscuit wanders over to drink from.
 * Drawn in a 120x150 viewBox, grounded at the bottom like the pets.
 */
export function Fountain() {
  return (
    <svg className="fountain-svg sticker-pet" viewBox="0 0 120 150" role="img" aria-label="Water fountain">
      <ellipse className="soft-shadow" cx="60" cy="140" rx="42" ry="7" />
      {/* basin */}
      <path
        d="M20 116 C20 132 100 132 100 116 L96 96 L24 96Z"
        fill="#cfe7f2"
        stroke={outline}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <ellipse cx="60" cy="96" rx="36" ry="9" fill="#eaf7fd" stroke={outline} strokeWidth="5" />
      {/* water surface */}
      <ellipse cx="60" cy="96" rx="27" ry="6" fill="#8fd0ec" />
      {/* central column */}
      <rect x="53" y="60" width="14" height="38" rx="6" fill="#d9ecf5" stroke={outline} strokeWidth="4.5" />
      {/* top dish */}
      <ellipse cx="60" cy="58" rx="20" ry="7" fill="#eaf7fd" stroke={outline} strokeWidth="4.5" />
      {/* arcing water jets */}
      <g className="fountain-jets" stroke="#8fd0ec" strokeWidth="3.4" strokeLinecap="round" fill="none">
        <path d="M60 54 C50 44 46 60 44 74" />
        <path d="M60 54 C70 44 74 60 76 74" />
        <path d="M60 52 L60 40" />
      </g>
      <circle cx="60" cy="38" r="3" fill="#8fd0ec" />
    </svg>
  );
}
