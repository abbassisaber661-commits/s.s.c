import whiteCoin from "@/assets/currency/coins/white.png";
import yellowCoin from "@/assets/currency/coins/yellow.png";
import orangeCoin from "@/assets/currency/coins/orange.png";
import redCoin from "@/assets/currency/coins/red.png";
import greenCoin from "@/assets/currency/coins/green.png";
import blueCoin from "@/assets/currency/coins/blue.png";
import purpleCoin from "@/assets/currency/coins/purple.png";

// Pi is the ONLY real payment/gifting currency in SkillLeague (Pi Network
// Testnet now, Mainnet later). These tiers are real Pi amounts paid through
// the Pi payment flow — they have nothing to do with DN$ points.
export interface PiGiftTier {
  id: string;
  nameAr: string;
  nameEn: string;
  image: string;
  tier: number;
  tierLabelAr: string;
  tierLabelEn: string;
  /** Real Pi amount charged via Pi.createPayment() */
  piAmount: number;
  glow: string;
}

export const PI_GIFT_TIERS: PiGiftTier[] = [
  { id: "white",  nameAr: "الأبيض",    nameEn: "White",  image: whiteCoin,  tier: 1, tierLabelAr: "0.01 π", tierLabelEn: "0.01 π", piAmount: 0.01, glow: "#c9ccd6" },
  { id: "yellow", nameAr: "الأصفر",    nameEn: "Yellow", image: yellowCoin, tier: 2, tierLabelAr: "0.05 π", tierLabelEn: "0.05 π", piAmount: 0.05, glow: "#ffd60a" },
  { id: "orange", nameAr: "البرتقالي", nameEn: "Orange", image: orangeCoin, tier: 3, tierLabelAr: "0.1 π",  tierLabelEn: "0.1 π",  piAmount: 0.1,  glow: "#c98a4b" },
  { id: "red",    nameAr: "الأحمر",    nameEn: "Red",    image: redCoin,    tier: 4, tierLabelAr: "0.5 π",  tierLabelEn: "0.5 π",  piAmount: 0.5,  glow: "#ef4444" },
  { id: "green",  nameAr: "الأخضر",    nameEn: "Green",  image: greenCoin,  tier: 5, tierLabelAr: "1 π",    tierLabelEn: "1 π",    piAmount: 1,    glow: "#22c55e" },
  { id: "blue",   nameAr: "الأزرق",    nameEn: "Blue",   image: blueCoin,   tier: 6, tierLabelAr: "5 π",    tierLabelEn: "5 π",    piAmount: 5,    glow: "#3b82f6" },
  { id: "purple", nameAr: "البنفسجي",  nameEn: "Purple", image: purpleCoin, tier: 7, tierLabelAr: "10 π",   tierLabelEn: "10 π",   piAmount: 10,   glow: "#a855f7" },
];

export const PI_GIFT_DEFINITION_AR =
  "الهدايا تُرسل بعملة Pi الحقيقية عبر شبكة Pi Network (الشبكة التجريبية حالياً، وشبكة الإنتاج لاحقاً). هذه هي عملة الدفع والهدايا الوحيدة في المنصة.";

export const PI_GIFT_DEFINITION_EN =
  "Gifts are sent using real Pi, via the Pi Network (Testnet now, Mainnet later). Pi is the only payment and gifting currency on the platform.";
