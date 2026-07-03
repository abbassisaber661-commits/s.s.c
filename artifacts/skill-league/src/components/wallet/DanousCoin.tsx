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
  { id: 1, name: "White",  nameAr: "أبيض",   colorName: "⚪", piValue: "0.001 π", base: "#FDFDFD", mid: "#E4E6EA", dark: "#B9BEC6", rim: "#C7CBD1", text: "#2B2E33", shadow: "rgba(180,185,195,0.55)" },
  { id: 2, name: "Yellow", nameAr: "أصفر",   colorName: "🟡", piValue: "0.005 π", base: "#FFE985", mid: "#FBC533", dark: "#B9860E", rim: "#8C6408", text: "#4A3300", shadow: "rgba(251,197,51,0.55)" },
  { id: 3, name: "Orange", nameAr: "برتقالي", colorName: "🟠", piValue: "0.01 π",  base: "#FFC583", mid: "#FF9736", dark: "#C05F0A", rim: "#8F4508", text: "#4A2200", shadow: "rgba(255,151,54,0.55)" },
  { id: 4, name: "Red",    nameAr: "أحمر",   colorName: "🔴", piValue: "0.05 π",  base: "#FF9A9A", mid: "#F0413E", dark: "#961F1D", rim: "#6E1614", text: "#FFFFFF", shadow: "rgba(240,65,62,0.55)" },
  { id: 5, name: "Green",  nameAr: "أخضر",   colorName: "🟢", piValue: "0.10 π",  base: "#A7EFAE", mid: "#33B94E", dark: "#1B7A31", rim: "#125421", text: "#FFFFFF", shadow: "rgba(51,185,78,0.55)" },
  { id: 6, name: "Blue",   nameAr: "أزرق",   colorName: "🔵", piValue: "0.50 π",  base: "#A9D4FF", mid: "#2F86E8", dark: "#124F94", rim: "#0C3A6D", text: "#FFFFFF", shadow: "rgba(47,134,232,0.55)" },
  { id: 7, name: "Purple", nameAr: "بنفسجي", colorName: "🟣", piValue: "1 π",     base: "#E3C4FF", mid: "#9B4FE8", dark: "#5B1F94", rim: "#3E1268", text: "#FFFFFF", shadow: "rgba(155,79,232,0.65)" },
];

export function DanousCoin({ tier, size = 120 }: { tier: DanousTier; size?: number }) {
  const uid = `coin-${tier.id}`;
  return (
    <div
      style={{ width: size, height: size, filter: `drop-shadow(0 6px 10px ${tier.shadow})` }}
      className="relative flex-shrink-0"
    >
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <defs>
          <radialGradient id={`${uid}-face`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={tier.base} />
            <stop offset="55%" stopColor={tier.mid} />
            <stop offset="100%" stopColor={tier.dark} />
          </radialGradient>
          <linearGradient id={`${uid}-rim`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tier.base} />
            <stop offset="45%" stopColor={tier.rim} />
            <stop offset="55%" stopColor={tier.dark} />
            <stop offset="100%" stopColor={tier.rim} />
          </linearGradient>
          <radialGradient id={`${uid}-shine`} cx="32%" cy="26%" r="40%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <pattern id={`${uid}-pattern`} width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
            <circle cx="9" cy="9" r="1.1" fill={tier.dark} opacity="0.18" />
          </pattern>
        </defs>

        {/* Outer engraved rim */}
        <circle cx="100" cy="100" r="98" fill={`url(#${uid}-rim)`} />
        <circle cx="100" cy="100" r="90" fill="none" stroke={tier.dark} strokeWidth="2" opacity="0.35" />
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i / 60) * Math.PI * 2;
          const x1 = 100 + Math.cos(angle) * 94;
          const y1 = 100 + Math.sin(angle) * 94;
          const x2 = 100 + Math.cos(angle) * 98.5;
          const y2 = 100 + Math.sin(angle) * 98.5;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tier.dark} strokeWidth="1.4" opacity="0.5" />
          );
        })}

        {/* Inner coin face */}
        <circle cx="100" cy="100" r="84" fill={`url(#${uid}-face)`} stroke={tier.rim} strokeWidth="2.5" />
        <circle cx="100" cy="100" r="84" fill={`url(#${uid}-pattern)`} />
        <circle cx="100" cy="100" r="76" fill="none" stroke={tier.base} strokeWidth="1.5" opacity="0.5" />

        {/* Shine highlight */}
        <ellipse cx="70" cy="55" rx="55" ry="38" fill={`url(#${uid}-shine)`} />

        {/* DN$ symbol - center */}
        <text
          x="100"
          y="98"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="46"
          fontWeight="900"
          fill={tier.text}
          fontFamily="Arial, sans-serif"
          style={{ letterSpacing: "-1px" }}
        >
          DN$
        </text>

        {/* Pi value - lower area, never overlapping DN$ */}
        <text
          x="100"
          y="146"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="22"
          fontWeight="800"
          fill={tier.text}
          fontFamily="Arial, sans-serif"
        >
          {tier.piValue}
        </text>
      </svg>
    </div>
  );
}
