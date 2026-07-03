import whiteCoin from "@/assets/coins/white.png";
import yellowCoin from "@/assets/coins/yellow.png";
import orangeCoin from "@/assets/coins/orange.png";
import redCoin from "@/assets/coins/red.png";
import greenCoin from "@/assets/coins/green.png";
import blueCoin from "@/assets/coins/blue.png";
import purpleCoin from "@/assets/coins/purple.png";

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
  image: string;
}

export const DANOUS_TIERS: DanousTier[] = [
  { id: 1, name: "White",  nameAr: "أبيض",   colorName: "⚪", piValue: "0.001 π", base: "#FFFFFF", mid: "#DEE2E8", dark: "#A9AFBA", rim: "#8B92A0", text: "#2B2E33", shadow: "rgba(160,166,178,0.55)", image: whiteCoin },
  { id: 2, name: "Yellow", nameAr: "أصفر",   colorName: "🟡", piValue: "0.005 π", base: "#FFF3B0", mid: "#F4C430", dark: "#A8760A", rim: "#7A5306", text: "#4A3300", shadow: "rgba(244,196,48,0.55)", image: yellowCoin },
  { id: 3, name: "Orange", nameAr: "برتقالي", colorName: "🟠", piValue: "0.01 π",  base: "#FFD3A0", mid: "#F5821F", dark: "#A34F08", rim: "#733806", text: "#3A1D00", shadow: "rgba(245,130,31,0.55)", image: orangeCoin },
  { id: 4, name: "Red",    nameAr: "أحمر",   colorName: "🔴", piValue: "0.05 π",  base: "#FFB3AE", mid: "#E23B33", dark: "#861815", rim: "#5C0F0D", text: "#FFFFFF", shadow: "rgba(226,59,51,0.55)", image: redCoin },
  { id: 5, name: "Green",  nameAr: "أخضر",   colorName: "🟢", piValue: "0.10 π",  base: "#B7F0BE", mid: "#25A244", dark: "#106823", rim: "#0A4718", text: "#FFFFFF", shadow: "rgba(37,162,68,0.55)", image: greenCoin },
  { id: 6, name: "Blue",   nameAr: "أزرق",   colorName: "🔵", piValue: "0.50 π",  base: "#B7DBFF", mid: "#1E73D6", dark: "#0E447F", rim: "#092F59", text: "#FFFFFF", shadow: "rgba(30,115,214,0.55)", image: blueCoin },
  { id: 7, name: "Purple", nameAr: "بنفسجي", colorName: "🟣", piValue: "1.00 π",  base: "#E8CCFF", mid: "#8B2FD6", dark: "#4C1478", rim: "#340C56", text: "#FFFFFF", shadow: "rgba(139,47,214,0.65)", image: purpleCoin },
];

export function DanousCoin({ tier, size = 120 }: { tier: DanousTier; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, filter: `drop-shadow(0 10px 16px ${tier.shadow})` }}
      className="relative flex-shrink-0"
    >
      <img
        src={tier.image}
        alt={`${tier.name} DN$`}
        width={size}
        height={size}
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
}
