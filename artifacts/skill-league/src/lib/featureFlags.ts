export const MVP_MODE = true;

export const FEATURES = {
  pvp:              true,
  tournament:       true,
  leaderboard:      true,
  dailyChallenges:  true,
  store:            true,
  wallet:           true,
  clans:            true,
  lootBoxes:        true,
  dailyRewards:     true,
  career:           true,
  news:             true,
  vip:              true,
  piLock:           true,

  events:           !MVP_MODE,
  aiCoach:          true,
  marketplace:      !MVP_MODE,
  analytics:        !MVP_MODE,
  community:        true,
  messages:         true,
  liveStream:       false,
  aiBroadcast:      false,
  globalEvents:     !MVP_MODE,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature] === true;
}

export function getMVPStatus() {
  const enabled  = Object.entries(FEATURES).filter(([, v]) => v).map(([k]) => k);
  const disabled = Object.entries(FEATURES).filter(([, v]) => !v).map(([k]) => k);
  return { mvpMode: MVP_MODE, enabled, disabled };
}
