export interface DanousTier {
  id: number;
  name: string;
  nameAr: string;
  colorName: string;
  piValue: string;
  base: string;
  mid: string;
  dark: string;
  rim: string;
  text: string;
  shadow: string;
}

export const DANOUS_TIERS: DanousTier[] = [
  { id: 1, name: "White",  nameAr: "أبيض",   colorName: "⚪", piValue: "0.001 π", base: "#FFFFFF", mid: "#DEE2E8", dark: "#A9AFBA", rim: "#8B92A0", text: "#2B2E33", shadow: "rgba(160,166,178,0.55)" },
  { id: 2, name: "Yellow", nameAr: "أصفر",   colorName: "🟡", piValue: "0.005 π", base: "#FFF3B0", mid: "#F4C430", dark: "#A8760A", rim: "#7A5306", text: "#4A3300", shadow: "rgba(244,196,48,0.55)" },
  { id: 3, name: "Orange", nameAr: "برتقالي", colorName: "🟠", piValue: "0.01 π",  base: "#FFD3A0", mid: "#F5821F", dark: "#A34F08", rim: "#733806", text: "#3A1D00", shadow: "rgba(245,130,31,0.55)" },
  { id: 4, name: "Red",    nameAr: "أحمر",   colorName: "🔴", piValue: "0.05 π",  base: "#FFB3AE", mid: "#E23B33", dark: "#861815", rim: "#5C0F0D", text: "#FFFFFF", shadow: "rgba(226,59,51,0.55)" },
  { id: 5, name: "Green",  nameAr: "أخضر",   colorName: "🟢", piValue: "0.10 π",  base: "#B7F0BE", mid: "#25A244", dark: "#106823", rim: "#0A4718", text: "#FFFFFF", shadow: "rgba(37,162,68,0.55)" },
  { id: 6, name: "Blue",   nameAr: "أزرق",   colorName: "🔵", piValue: "0.50 π",  base: "#B7DBFF", mid: "#1E73D6", dark: "#0E447F", rim: "#092F59", text: "#FFFFFF", shadow: "rgba(30,115,214,0.55)" },
  { id: 7, name: "Purple", nameAr: "بنفسجي", colorName: "🟣", piValue: "1 π",     base: "#E8CCFF", mid: "#8B2FD6", dark: "#4C1478", rim: "#340C56", text: "#FFFFFF", shadow: "rgba(139,47,214,0.65)" },
];

export function DanousCoin({ tier, size = 120 }: { tier: DanousTier; size?: number }) {
  const uid = `coin-${tier.id}`;
  return (
    <div
      style={{ width: size, height: size, filter: `drop-shadow(0 8px 14px ${tier.shadow})` }}
      className="relative flex-shrink-0"
    >
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <defs>
          {/* Outer rim — brushed metal with directional light */}
          <linearGradient id={`${uid}-rimEdge`} x1="15%" y1="10%" x2="85%" y2="95%">
            <stop offset="0%" stopColor={tier.base} />
            <stop offset="30%" stopColor={tier.mid} />
            <stop offset="55%" stopColor={tier.rim} />
            <stop offset="75%" stopColor={tier.dark} />
            <stop offset="100%" stopColor={tier.rim} />
          </linearGradient>

          {/* Inner ring band */}
          <linearGradient id={`${uid}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tier.mid} />
            <stop offset="50%" stopColor={tier.dark} />
            <stop offset="100%" stopColor={tier.rim} />
          </linearGradient>

          {/* Coin face — domed metallic look */}
          <radialGradient id={`${uid}-face`} cx="38%" cy="30%" r="80%">
            <stop offset="0%" stopColor={tier.base} />
            <stop offset="40%" stopColor={tier.mid} />
            <stop offset="78%" stopColor={tier.dark} />
            <stop offset="100%" stopColor={tier.rim} />
          </radialGradient>

          {/* Specular shine */}
          <radialGradient id={`${uid}-shine`} cx="30%" cy="22%" r="35%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          {/* Secondary bottom rim-light */}
          <radialGradient id={`${uid}-rimlight`} cx="72%" cy="82%" r="35%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          {/* Emboss filter for the DN$ text */}
          <filter id={`${uid}-emboss`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2.2" stdDeviation="0.6" floodColor={tier.dark} floodOpacity="0.85" />
            <feDropShadow dx="0" dy="-1.4" stdDeviation="0.5" floodColor={tier.base} floodOpacity="0.55" />
          </filter>

          {/* Subtle background emboss pattern (SkillLeague trophy motif, simplified) */}
          <pattern id={`${uid}-pattern`} width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
            <circle cx="13" cy="13" r="1.3" fill={tier.dark} opacity="0.16" />
            <circle cx="0" cy="0" r="1.3" fill={tier.base} opacity="0.12" />
          </pattern>
        </defs>

        {/* ── Outer engraved rim ── */}
        <circle cx="100" cy="100" r="98" fill={`url(#${uid}-rimEdge)`} />
        {Array.from({ length: 90 }).map((_, i) => {
          const angle = (i / 90) * Math.PI * 2;
          const x1 = 100 + Math.cos(angle) * 91.5;
          const y1 = 100 + Math.sin(angle) * 91.5;
          const x2 = 100 + Math.cos(angle) * 97.5;
          const y2 = 100 + Math.sin(angle) * 97.5;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tier.dark} strokeWidth="1.3" opacity="0.45" />
          );
        })}
        <circle cx="100" cy="100" r="93" fill="none" stroke={tier.base} strokeWidth="1" opacity="0.35" />

        {/* ── Decorative inner ring with engravings ── */}
        <circle cx="100" cy="100" r="88" fill={`url(#${uid}-ring)`} />
        <circle cx="100" cy="100" r="88" fill="none" stroke={tier.dark} strokeWidth="1.5" opacity="0.5" />
        {Array.from({ length: 40 }).map((_, i) => {
          const angle = (i / 40) * Math.PI * 2;
          const x1 = 100 + Math.cos(angle) * 82.5;
          const y1 = 100 + Math.sin(angle) * 82.5;
          const x2 = 100 + Math.cos(angle) * 86.5;
          const y2 = 100 + Math.sin(angle) * 86.5;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tier.base} strokeWidth="1" opacity="0.35" />
          );
        })}

        {/* ── Coin face (domed) ── */}
        <circle cx="100" cy="100" r="80" fill={`url(#${uid}-face)`} stroke={tier.rim} strokeWidth="2" />
        <circle cx="100" cy="100" r="80" fill={`url(#${uid}-pattern)`} />

        {/* Twin decorative grooves */}
        <circle cx="100" cy="100" r="73" fill="none" stroke={tier.base} strokeWidth="1.2" opacity="0.45" />
        <circle cx="100" cy="100" r="68" fill="none" stroke={tier.dark} strokeWidth="1" opacity="0.35" />

        {/* Small tick marks around the inner dial, like a minted coin */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * Math.PI * 2;
          const x1 = 100 + Math.cos(angle) * 63;
          const y1 = 100 + Math.sin(angle) * 63;
          const x2 = 100 + Math.cos(angle) * 68;
          const y2 = 100 + Math.sin(angle) * 68;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tier.base} strokeWidth="1" opacity="0.3" />
          );
        })}

        {/* Bottom rim light */}
        <circle cx="100" cy="100" r="80" fill={`url(#${uid}-rimlight)`} />

        {/* Main specular shine */}
        <ellipse cx="72" cy="58" rx="50" ry="34" fill={`url(#${uid}-shine)`} />

        {/* DN$ symbol — embossed, centered */}
        <text
          x="100"
          y="93"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="42"
          fontWeight="900"
          fill={tier.text}
          fontFamily="Arial, sans-serif"
          filter={`url(#${uid}-emboss)`}
          style={{ letterSpacing: "-1px" }}
        >
          DN$
        </text>

        {/* Pi value — lower area, embossed, never overlapping DN$ */}
        <text
          x="100"
          y="138"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="19"
          fontWeight="800"
          fill={tier.text}
          fontFamily="Arial, sans-serif"
          filter={`url(#${uid}-emboss)`}
        >
          {tier.piValue}
        </text>

        {/* Fine underline separating symbol from value for extra clarity */}
        <line x1="80" y1="112" x2="120" y2="112" stroke={tier.text} strokeWidth="1" opacity="0.25" />
      </svg>
    </div>
  );
}
