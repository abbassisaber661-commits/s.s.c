// DN$ (Danous) is a pure internal gamification points system. It has NO
// monetary value, NO conversion or exchange rate to Pi (or any currency),
// and CANNOT be sent, gifted, or withdrawn between users — it is earned
// only through gameplay: matches, streaks, levels, daily tasks, and achievements.
//
// Real payments and gifting use Pi exclusively — see `piGiftTiers.ts` and
// `routes/pi-payments.ts`.

export const DANOUS_CURRENCY_DEFINITION =
  "DN$ (Danous) is an internal gamification points system in S.S.C. It reflects your in-app progress — earned from matches, streaks, levels, daily tasks, and achievements. DN$ has no monetary value, no exchange rate to Pi or any other currency, and cannot be transferred, gifted, or withdrawn.";

export const DANOUS_CURRENCY_DEFINITION_AR =
  "عملة Danous (DN$) هي نظام نقاط داخلي للتقدّم داخل S.S.C فقط. تُكتسب من المهام اليومية، المباريات، السلاسل المتتالية، المستويات، والإنجازات. ليس لها أي قيمة نقدية، ولا معدل تحويل إلى Pi أو أي عملة أخرى، ولا يمكن إرسالها أو إهداؤها أو سحبها.";

export interface DanousEarnSource {
  icon: string;
  labelAr: string;
  labelEn: string;
}

export const DANOUS_EARN_SOURCES: DanousEarnSource[] = [
  { icon: "🌅", labelAr: "تسجيل الدخول اليومي",          labelEn: "Daily login reward"          },
  { icon: "⚽", labelAr: "إكمال مباراة يومياً",            labelEn: "Complete a daily match"       },
  { icon: "📝", labelAr: "إنشاء منشور وستوري",             labelEn: "Create a post & story"        },
  { icon: "💬", labelAr: "التفاعل الاجتماعي (إعجابات + تعليقات)", labelEn: "Social interactions"   },
  { icon: "⭐", labelAr: "استلام إعجابات على منشوراتك",    labelEn: "Get likes on your posts"      },
  { icon: "🏆", labelAr: "الترقية بين المستويات",           labelEn: "Leveling up"                  },
  { icon: "🔥", labelAr: "سلاسل الانتصارات اليومية",       labelEn: "Daily win streaks"            },
  { icon: "🥇", labelAr: "إنجازات وأوسمة خاصة",            labelEn: "Achievements & badges"        },
  { icon: "🌀", labelAr: "مكافآت نهاية الموسم",            labelEn: "Season-end rewards"           },
  { icon: "🎉", labelAr: "مكافآت البطولات والفعاليات",      labelEn: "Tournament & event rewards"   },
];
