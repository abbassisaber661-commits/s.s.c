const REFERRAL_KEY = 'sl_referral_data';

export interface ReferralData {
  code: string;
  joinedCount: number;
  rewardedCount: number;
  createdAt: number;
}

export function generateCode(username: string): string {
  const base   = username.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5).padEnd(3, 'X');
  const suffix = Math.floor(Math.random() * 9000 + 1000).toString();
  return `${base}${suffix}`;
}

export function getReferral(username: string): ReferralData {
  try {
    const raw = localStorage.getItem(REFERRAL_KEY);
    if (raw) return JSON.parse(raw) as ReferralData;
  } catch { /* ignore */ }
  const fresh: ReferralData = {
    code: generateCode(username),
    joinedCount: 0,
    rewardedCount: 0,
    createdAt: Date.now(),
  };
  localStorage.setItem(REFERRAL_KEY, JSON.stringify(fresh));
  return fresh;
}

export function checkReferralCode(inputCode: string, myCode: string): boolean {
  return inputCode.trim().toUpperCase() === myCode.toUpperCase() ? false : true;
}

export function applyReferralJoin(referralData: ReferralData): ReferralData {
  const updated = { ...referralData, joinedCount: referralData.joinedCount + 1 };
  localStorage.setItem(REFERRAL_KEY, JSON.stringify(updated));
  return updated;
}

export function claimReferralReward(referralData: ReferralData): { data: ReferralData; coinsReward: number } {
  const unclaimed = referralData.joinedCount - referralData.rewardedCount;
  if (unclaimed <= 0) return { data: referralData, coinsReward: 0 };
  const coinsReward = unclaimed * 100;
  const updated = { ...referralData, rewardedCount: referralData.joinedCount };
  localStorage.setItem(REFERRAL_KEY, JSON.stringify(updated));
  return { data: updated, coinsReward };
}

export function buildShareText(username: string, code: string, score?: number, league?: string): string {
  const scoreText = score ? `Just scored ${score} pts in ${league ?? 'SkillLeague'}! ` : '';
  return `${scoreText}Join me on SkillLeague — the fastest word game on Pi Network! Use my code ${code} to get a bonus. 🎮⚡ #SkillLeague #PiNetwork`;
}

export function buildResultShareText(username: string, score: number, accuracy: number, streak: number): string {
  return `🎮 SkillLeague Match Result\n👤 ${username}\n📊 Score: ${score} pts\n🎯 Accuracy: ${accuracy}%\n⚡ Best Streak: ${streak}\n\n#SkillLeague #PiNetwork`;
}

export const REFERRAL_REWARD_PER_FRIEND = 100;
