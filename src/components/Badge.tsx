interface Props {
  size?: number;
}

/**
 * Home-page badge. An original shield built from the GDG palette: a four-colour
 * ring, the chevron mark at the centre, and the chapter name on a banner.
 */
export default function Badge({ size = 300 }: Props) {
  return (
    <svg
      viewBox="0 0 300 340"
      width={size}
      height={(size * 340) / 300}
      className="badge"
      role="img"
      aria-label="GDG on Campus, TIET"
    >
      <defs>
        <linearGradient id="shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--badge-top)" />
          <stop offset="100%" stopColor="var(--badge-bottom)" />
        </linearGradient>
        <linearGradient id="banner" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="34%" stopColor="#EA4335" />
          <stop offset="67%" stopColor="#FBBC04" />
          <stop offset="100%" stopColor="#34A853" />
        </linearGradient>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      {/* glow */}
      <ellipse cx="150" cy="160" rx="105" ry="120" fill="#4285F4" opacity="0.16" filter="url(#soft)" />

      {/* shield */}
      <path
        d="M150 14 L272 56 v128 c0 62-52 108-122 138 C80 292 28 246 28 184 V56 Z"
        fill="url(#shield)"
        stroke="var(--badge-edge)"
        strokeWidth="2"
      />

      {/* four-colour ring */}
      <g fill="none" strokeWidth="9" strokeLinecap="round">
        <path d="M150 62 A78 78 0 0 1 228 140" stroke="#EA4335" />
        <path d="M228 140 A78 78 0 0 1 150 218" stroke="#FBBC04" />
        <path d="M150 218 A78 78 0 0 1 72 140" stroke="#34A853" />
        <path d="M72 140 A78 78 0 0 1 150 62" stroke="#4285F4" />
      </g>

      {/* chevron mark */}
      <g fill="none" strokeWidth="14" strokeLinecap="round" transform="translate(96 86) scale(1.08)">
        <path d="M44 24 L20 50" stroke="#EA4335" />
        <path d="M20 50 L44 76" stroke="#4285F4" />
        <path d="M56 24 L80 50" stroke="#34A853" />
        <path d="M80 50 L56 76" stroke="#FBBC04" />
      </g>

      {/* banner */}
      <path d="M40 236 h220 l-16 26 16 26 H40 l16-26 Z" fill="url(#banner)" opacity="0.92" />
      <text
        x="150"
        y="269"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="19"
        fontWeight="600"
        letterSpacing="2.4"
        fontFamily="Inter, system-ui, sans-serif"
      >
        ON CAMPUS
      </text>

      <text
        x="150"
        y="316"
        textAnchor="middle"
        fill="var(--muted)"
        fontSize="15"
        letterSpacing="3.4"
        fontFamily="Inter, system-ui, sans-serif"
      >
        TIET · PATIALA
      </text>
    </svg>
  );
}
