// DN$ (Danous) is a pure internal gamification points system. It has NO
// monetary value, NO conversion or exchange rate to Pi (or any currency),
// and CANNOT be sent, gifted, or withdrawn between users — it is earned
// only through gameplay: matches, streaks, levels, and achievements.
//
// Real payments and gifting use Pi exclusively — see `piGiftTiers.ts` and
// `routes/pi-payments.ts`.

export const DANOUS_CURRENCY_DEFINITION =
  "DN$ (Danous) is an internal gamification points system in SkillLeague. It reflects your in-app progress — earned from matches, streaks, levels, and achievements. DN$ has no monetary value, no exchange rate to Pi or any other currency, and cannot be transferred, gifted, or withdrawn.";

export const DANOUS_CURRENCY_DEFINITION_AR =
  "عملة Danous (DN$) هي نظام نقاط داخلي للتقدّم داخل SkillLeague فقط. تُكتسب من المباريات، السلاسل المتتالية، المستويات، والإنجازات. ليس لها أي قيمة نقدية، ولا معدل تحويل إلى Pi أو أي عملة أخرى، ولا يمكن إرسالها أو إهداؤها أو سحبها.";

export interface DanousEarnSource {
  icon: string;
  labelAr: string;
  labelEn: string;
}

export const DANOUS_EARN_SOURCES: DanousEarnSource[] = [
  { icon: "🎮", labelAr: "الفوز في المباريات", labelEn: "Winning matches" },
  { icon: "🔥", labelAr: "سلاسل الانتصارات اليومية", labelEn: "Daily streaks" },
  { icon: "🏆", labelAr: "الترقية بين المستويات", labelEn: "Leveling up" },
  { icon: "🥇", labelAr: "إنجازات وأوسمة خاصة", labelEn: "Achievements & badges" },
];
