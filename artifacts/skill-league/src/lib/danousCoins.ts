import whiteCoin from "@/assets/currency/coins/white.png";
import yellowCoin from "@/assets/currency/coins/yellow.png";
import orangeCoin from "@/assets/currency/coins/orange.png";
import redCoin from "@/assets/currency/coins/red.png";
import greenCoin from "@/assets/currency/coins/green.png";
import blueCoin from "@/assets/currency/coins/blue.png";
import purpleCoin from "@/assets/currency/coins/purple.png";

export interface DanousCoinTier {
  id: string;
  nameAr: string;
  nameEn: string;
  image: string;
  tier: number;
  tierLabelAr: string;
  tierLabelEn: string;
  /** Integer DN$ amount sent to the wallet API — represents gift level, no monetary value */
  dnAmount: number;
  glow: string;
}

export const DANOUS_COINS: DanousCoinTier[] = [
  { id: "white",  nameAr: "الأبيض",    nameEn: "White Coin",  image: whiteCoin,  tier: 1, tierLabelAr: "المستوى 1", tierLabelEn: "Tier 1", dnAmount: 1,    glow: "#c9ccd6" },
  { id: "yellow", nameAr: "الأصفر",    nameEn: "Yellow Coin", image: yellowCoin, tier: 2, tierLabelAr: "المستوى 2", tierLabelEn: "Tier 2", dnAmount: 5,    glow: "#ffd60a" },
  { id: "orange", nameAr: "البرتقالي", nameEn: "Orange Coin", image: orangeCoin, tier: 3, tierLabelAr: "المستوى 3", tierLabelEn: "Tier 3", dnAmount: 10,   glow: "#c98a4b" },
  { id: "red",    nameAr: "الأحمر",    nameEn: "Red Coin",    image: redCoin,    tier: 4, tierLabelAr: "المستوى 4", tierLabelEn: "Tier 4", dnAmount: 50,   glow: "#ef4444" },
  { id: "green",  nameAr: "الأخضر",    nameEn: "Green Coin",  image: greenCoin,  tier: 5, tierLabelAr: "المستوى 5", tierLabelEn: "Tier 5", dnAmount: 100,  glow: "#22c55e" },
  { id: "blue",   nameAr: "الأزرق",    nameEn: "Blue Coin",   image: blueCoin,   tier: 6, tierLabelAr: "المستوى 6", tierLabelEn: "Tier 6", dnAmount: 500,  glow: "#3b82f6" },
  { id: "purple", nameAr: "البنفسجي",  nameEn: "Purple Coin", image: purpleCoin, tier: 7, tierLabelAr: "المستوى 7", tierLabelEn: "Tier 7", dnAmount: 1000, glow: "#a855f7" },
];

export const DANOUS_CURRENCY_DEFINITION =
  "DN$ (Danous) is an in-app gifting and reward currency used inside SkillLeague. It represents gift levels and engagement only and has no monetary value or conversion rate to any external currency.";

export const DANOUS_CURRENCY_DEFINITION_AR =
  "عملة Danous (DN$) هي عملة داخلية للهدايا والمكافآت في SkillLeague. تمثل مستويات الهدايا والتفاعل فقط، وليس لها أي قيمة نقدية أو معدل تحويل لأي عملة خارجية.";
