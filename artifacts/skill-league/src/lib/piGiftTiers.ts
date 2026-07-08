// Pi is the ONLY real payment/gifting currency in SkillLeague (Pi Network
// Testnet now, Mainnet later). These tiers are real Pi amounts paid through
// the Pi payment flow — they have nothing to do with DN$ points.
//
// Premium gift system: 5 rows x 4 amounts, rendered as purple-outlined rings
// (not filled coins). Each row gets a progressively deeper purple gradient,
// from light purple (row 1) to strong/deep purple (row 5).
export interface PiGiftTier {
  id: string;
  /** 1-5, controls the ring gradient + text color used to render this tier */
  row: 1 | 2 | 3 | 4 | 5;
  /** Real Pi amount charged via Pi.createPayment() */
  piAmount: number;
}

export const PI_GIFT_TIERS: PiGiftTier[] = [
  // Row 1 — Light Purple
  { id: "g01", row: 1, piAmount: 0.001 },
  { id: "g02", row: 1, piAmount: 0.005 },
  { id: "g03", row: 1, piAmount: 0.01 },
  { id: "g04", row: 1, piAmount: 0.05 },
  // Row 2 — Slightly Darker Purple
  { id: "g05", row: 2, piAmount: 0.1 },
  { id: "g06", row: 2, piAmount: 0.5 },
  { id: "g07", row: 2, piAmount: 0.7 },
  { id: "g08", row: 2, piAmount: 0.9 },
  // Row 3 — Medium Purple
  { id: "g09", row: 3, piAmount: 1 },
  { id: "g10", row: 3, piAmount: 1.25 },
  { id: "g11", row: 3, piAmount: 1.5 },
  { id: "g12", row: 3, piAmount: 1.7 },
  // Row 4 — Dark Purple
  { id: "g13", row: 4, piAmount: 2 },
  { id: "g14", row: 4, piAmount: 2.5 },
  { id: "g15", row: 4, piAmount: 3 },
  { id: "g16", row: 4, piAmount: 3.5 },
  // Row 5 — Strong Purple
  { id: "g17", row: 5, piAmount: 4 },
  { id: "g18", row: 5, piAmount: 5 },
  { id: "g19", row: 5, piAmount: 8 },
  { id: "g20", row: 5, piAmount: 10 },
];

/** Ring gradient (outline only) + label color per row — light → deep purple. */
export const GIFT_ROW_COLORS: Record<
  PiGiftTier["row"],
  { from: string; to: string; text: string; glow: string }
> = {
  1: { from: "#EDE4FF", to: "#D3BCFF", text: "#8B5CF6", glow: "rgba(139,92,246,0.35)" },
  2: { from: "#C9AEFC", to: "#A78BFA", text: "#7C3AED", glow: "rgba(124,58,237,0.4)" },
  3: { from: "#A78BFA", to: "#8B5CF6", text: "#6D28D9", glow: "rgba(109,40,217,0.45)" },
  4: { from: "#8B5CF6", to: "#6D28D9", text: "#5B21B6", glow: "rgba(91,33,182,0.5)" },
  5: { from: "#6D28D9", to: "#3B0764", text: "#3B0764", glow: "rgba(59,7,100,0.55)" },
};

/** Trim a Pi amount to its shortest readable form, e.g. 0.001, 1.25, 10. */
export function formatGiftAmount(amount: number): string {
  return String(amount);
}

export const PI_GIFT_DEFINITION_AR =
  "الهدايا تُرسل بعملة Pi الحقيقية عبر شبكة Pi Network (الشبكة التجريبية حالياً، وشبكة الإنتاج لاحقاً). هذه هي عملة الدفع والهدايا الوحيدة في المنصة.";

export const PI_GIFT_DEFINITION_EN =
  "Gifts are sent using real Pi, via the Pi Network (Testnet now, Mainnet later). Pi is the only payment and gifting currency on the platform.";
