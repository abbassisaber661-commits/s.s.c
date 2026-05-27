export type Language = 'en' | 'ar';

export const translations = {
  en: {
    app_name: "SkillLeague",
    tagline: "Pure instinct. Pure speed.",
    sign_in_pi: "Sign In with Pi",
    play: "PLAY",
    rules: "Rules",
    training_coins: "Training Coins",
    entry_tokens: "Entry Tokens",
    league_training: "Training",
    league_easy: "Easy",
    league_ranked: "Ranked",
    league_elite: "Elite",
    free: "Free",
    entry: "Entry:",
    score: "Score:",
    streak: "Streak:",
    results_title: "Results",
    accuracy: "Accuracy:",
    earned: "Earned:",
    play_again: "Play Again",
    back_to_leagues: "Leagues",
    logout: "Logout",
    insufficient_funds: "Insufficient funds"
  },
  ar: {
    app_name: "سكيل ليج",
    tagline: "غريزة نقية. سرعة خالصة.",
    sign_in_pi: "تسجيل الدخول عبر Pi",
    play: "العب",
    rules: "القواعد",
    training_coins: "عملات التدريب",
    entry_tokens: "رموز الدخول",
    league_training: "تدريب",
    league_easy: "سهل",
    league_ranked: "مصنف",
    league_elite: "نخبة",
    free: "مجاني",
    entry: "الدخول:",
    score: "النتيجة:",
    streak: "سلسلة:",
    results_title: "النتائج",
    accuracy: "الدقة:",
    earned: "مكتسب:",
    play_again: "العب مرة أخرى",
    back_to_leagues: "الدوريات",
    logout: "خروج",
    insufficient_funds: "رصيد غير كاف"
  }
};

export function getTranslation(lang: Language, key: keyof typeof translations['en']) {
  return translations[lang][key];
}
