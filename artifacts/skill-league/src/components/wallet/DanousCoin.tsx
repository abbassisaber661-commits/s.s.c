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
  { id: 7, name: "Purple", nameAr: "بنفسجي", colorName: "🟣", piValue: "1.00 π",  base: "#E8CCFF", mid: "#8B2FD6", dark: "#4C1478", rim: "#340C56", text: "#FFFFFF", shadow: "rgba(139,47,214,0.65)" },
];

function Star({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={size}
      fill={color}
    >
      ★
    </text>
  );
}

export function DanousCoin({ tier, size = 120 }: { tier: DanousTier; size?: number }) {
  const uid = `coin-${tier.id}`;
  const [pNum, pSym] = tier.piValue.split(" ");
  const starColor = tier.text;

  return (
    <div
      style={{ width: size, height: size, filter: `drop-shadow(0 10px 16px ${tier.shadow})` }}
      className="relative flex-shrink-0"
    >
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <defs>
          {/* Thick outer metallic rim — brushed, directional light */}
          <linearGradient id={`${uid}-rim`} x1="15%" y1="8%" x2="85%" y2="95%">
            <stop offset="0%" stopColor={tier.base} />
            <stop offset="22%" stopColor={tier.mid} />
            <stop offset="45%" stopColor={tier.rim} />
            <stop offset="65%" stopColor={tier.dark} />
            <stop offset="82%" stopColor={tier.rim} />
            <stop offset="100%" stopColor={tier.dark} />
          </linearGradient>

          {/* Bevel step between rim and face */}
          <linearGradient id={`${uid}-bevel`} x1="20%" y1="10%" x2="80%" y2="90%">
            <stop offset="0%" stopColor={tier.dark} />
            <stop offset="50%" stopColor={tier.rim} />
            <stop offset="100%" stopColor={tier.dark} />
          </linearGradient>

          {/* Coin face — domed metallic gradient */}
          <radialGradient id={`${uid}-face`} cx="35%" cy="26%" r="85%">
            <stop offset="0%" stopColor={tier.base} />
            <stop offset="40%" stopColor={tier.mid} />
            <stop offset="78%" stopColor={tier.dark} />
            <stop offset="100%" stopColor={tier.rim} />
          </radialGradient>

          {/* Primary specular shine */}
          <radialGradient id={`${uid}-shine`} cx="32%" cy="22%" r="40%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0.16)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          {/* Secondary bottom-right rim light */}
          <radialGradient id={`${uid}-rimlight`} cx="76%" cy="82%" r="32%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          {/* Vignette to push edges into shadow for a domed feel */}
          <radialGradient id={`${uid}-vignette`} cx="50%" cy="50%" r="52%">
            <stop offset="60%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
          </radialGradient>

          <filter id={`${uid}-emboss`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="0.6" floodColor={tier.dark} floodOpacity="0.8" />
            <feDropShadow dx="0" dy="-1.2" stdDeviation="0.5" floodColor={tier.base} floodOpacity="0.5" />
          </filter>

          {/* Subtle embossed background dot pattern */}
          <pattern id={`${uid}-pattern`} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
            <circle cx="8" cy="8" r="0.9" fill={tier.dark} opacity="0.16" />
            <circle cx="0" cy="0" r="0.9" fill={tier.base} opacity="0.12" />
          </pattern>
        </defs>

        {/* Thick brushed-metal outer rim */}
        <circle cx="100" cy="100" r="98" fill={`url(#${uid}-rim)`} />
        {Array.from({ length: 100 }).map((_, i) => {
          const angle = (i / 100) * Math.PI * 2;
          const x1 = 100 + Math.cos(angle) * 89;
          const y1 = 100 + Math.sin(angle) * 89;
          const x2 = 100 + Math.cos(angle) * 97.5;
          const y2 = 100 + Math.sin(angle) * 97.5;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tier.dark} strokeWidth="1.1" opacity="0.4" />;
        })}
        <circle cx="100" cy="100" r="98" fill="none" stroke={tier.dark} strokeWidth="1.5" opacity="0.6" />
        <circle cx="100" cy="100" r="93.5" fill="none" stroke={tier.base} strokeWidth="1" opacity="0.4" />

        {/* Bevel step down into the face */}
        <circle cx="100" cy="100" r="89" fill={`url(#${uid}-bevel)`} />

        {/* Coin face (domed) */}
        <circle cx="100" cy="100" r="82" fill={`url(#${uid}-face)`} stroke={tier.dark} strokeWidth="1.5" />
        <circle cx="100" cy="100" r="82" fill={`url(#${uid}-pattern)`} />

        {/* Engraved inner ring with fine ticks */}
        <circle cx="100" cy="100" r="74" fill="none" stroke={tier.text} strokeWidth="2" opacity="0.55" />
        <circle cx="100" cy="100" r="70" fill="none" stroke={tier.dark} strokeWidth="1" opacity="0.35" />
        {Array.from({ length: 48 }).map((_, i) => {
          const angle = (i / 48) * Math.PI * 2;
          const x1 = 100 + Math.cos(angle) * 70.5;
          const y1 = 100 + Math.sin(angle) * 70.5;
          const x2 = 100 + Math.cos(angle) * 73.5;
          const y2 = 100 + Math.sin(angle) * 73.5;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tier.base} strokeWidth="0.9" opacity="0.3" />;
        })}

        {/* Domed vignette for 3D roundness */}
        <circle cx="100" cy="100" r="82" fill={`url(#${uid}-vignette)`} />

        {/* Bottom-right rim light reflection */}
        <circle cx="100" cy="100" r="82" fill={`url(#${uid}-rimlight)`} />

        {/* Primary specular shine */}
        <ellipse cx="72" cy="56" rx="48" ry="32" fill={`url(#${uid}-shine)`} />

        {/* Top three stars — untouched */}
        <Star x={72} y={52} size={13} color={starColor} />
        <Star x={100} y={44} size={14} color={starColor} />
        <Star x={128} y={52} size={13} color={starColor} />

        {/* Center DN$ symbol */}
        <text
          x="100"
          y="112"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="44"
          fontWeight="900"
          fill={tier.text}
          fontFamily="Arial, sans-serif"
          filter={`url(#${uid}-emboss)`}
          style={{ letterSpacing: "-1px" }}
        >
          DN$
        </text>

        {/* Bottom — pi value replacing the stars */}
        <text
          x="100"
          y="152"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="Arial, sans-serif"
          filter={`url(#${uid}-emboss)`}
        >
          <tspan fontSize="20" fontWeight="800" fill={tier.text}>{pNum} </tspan>
          <tspan fontSize="20" fontWeight="800" fill="#FFD60A">{pSym}</tspan>
        </text>
      </svg>
    </div>
  );
}
