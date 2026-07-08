/**
 * DNCurrencyIcon — Official DN$ banknote icon component.
 *
 * Shows the official S.S.C SkillLeague banknote at various sizes.
 * Always renders as a rounded-rectangle (banknote shape), never a circle.
 *
 * Usage:
 *   <DNCurrencyIcon size="xs" />   — inline next to reward numbers (36 × 22 px)
 *   <DNCurrencyIcon size="sm" />   — section badges / list rows (52 × 32 px)
 *   <DNCurrencyIcon size="md" />   — balance labels (80 × 48 px)
 *   <DNCurrencyIcon size="lg" />   — wallet card display (140 × 88 px)
 *   <DNCurrencyIcon size="hero" /> — full-width wallet banner
 */

import dnsBanknote from "@/assets/currency/dns-banknote.jpg";

type DNSize = "xs" | "sm" | "md" | "lg" | "hero";

const SIZE_STYLE: Record<DNSize, { width: number; height: number; radius: string }> = {
  xs:   { width: 36,  height: 22,  radius: "3px"  },
  sm:   { width: 52,  height: 32,  radius: "5px"  },
  md:   { width: 80,  height: 48,  radius: "7px"  },
  lg:   { width: 140, height: 86,  radius: "10px" },
  hero: { width: 0,   height: 0,   radius: "14px" }, // full-width via CSS
};

interface DNCurrencyIconProps {
  size?: DNSize;
  className?: string;
}

export default function DNCurrencyIcon({ size = "sm", className = "" }: DNCurrencyIconProps) {
  const s = SIZE_STYLE[size];

  if (size === "hero") {
    return (
      <div
        className={`w-full overflow-hidden flex-shrink-0 ${className}`}
        style={{ borderRadius: s.radius, aspectRatio: "8 / 3" }}
      >
        <img
          src={dnsBanknote}
          alt="DN$ — Official S.S.C SkillLeague Currency"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 38%",
            display: "block",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex-shrink-0 overflow-hidden ${className}`}
      style={{
        width:  s.width,
        height: s.height,
        borderRadius: s.radius,
        flexShrink: 0,
      }}
    >
      <img
        src={dnsBanknote}
        alt="DN$"
        draggable={false}
        style={{
          width:    "100%",
          height:   "100%",
          objectFit: "cover",
          objectPosition: "center 38%",
          display:  "block",
        }}
      />
    </div>
  );
}
