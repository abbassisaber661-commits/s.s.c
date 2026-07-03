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
  piValue: number;
  piLabel: string;
  /** Integer DN$ amount sent to the wallet API (1 DN$ unit == 0.001 π) */
  dnAmount: number;
  glow: string;
}

export const DANOUS_COINS: DanousCoinTier[] = [
  { id: "white",  nameAr: "الأبيض",   nameEn: "White Coin",  image: whiteCoin,  piValue: 0.001, piLabel: "0.001 π", dnAmount: 1,    glow: "#c9ccd6" },
  { id: "yellow", nameAr: "الأصفر",   nameEn: "Yellow Coin", image: yellowCoin, piValue: 0.005, piLabel: "0.005 π", dnAmount: 5,    glow: "#ffd60a" },
  { id: "orange", nameAr: "البرتقالي", nameEn: "Orange Coin", image: orangeCoin, piValue: 0.01,  piLabel: "0.01 π",  dnAmount: 10,   glow: "#c98a4b" },
  { id: "red",    nameAr: "الأحمر",   nameEn: "Red Coin",    image: redCoin,    piValue: 0.05,  piLabel: "0.05 π",  dnAmount: 50,   glow: "#ef4444" },
  { id: "green",  nameAr: "الأخضر",   nameEn: "Green Coin",  image: greenCoin,  piValue: 0.10,  piLabel: "0.10 π",  dnAmount: 100,  glow: "#22c55e" },
  { id: "blue",   nameAr: "الأزرق",   nameEn: "Blue Coin",   image: blueCoin,   piValue: 0.50,  piLabel: "0.50 π",  dnAmount: 500,  glow: "#3b82f6" },
  { id: "purple", nameAr: "البنفسجي", nameEn: "Purple Coin", image: purpleCoin, piValue: 1.00,  piLabel: "1.00 π",  dnAmount: 1000, glow: "#a855f7" },
];
