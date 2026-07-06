export const BALANCE = {
  dn: {
    matchWin:          { base: 2,  variance: 1 },
    matchLoss:         { base: 1,  variance: 0 },
    pvpWin:            { base: 5,  variance: 2 },
    pvpLoss:           { base: 1,  variance: 0 },
    tournamentFirst:   20,
    tournamentSecond:  15,
    tournamentThird:   10,
    dailyLogin:        1,
    dailyChallenge:    { min: 1, max: 3 },
    lootBoxCommon:     { min: 1, max: 2 },
    lootBoxRare:       { min: 2, max: 5 },
    lootBoxEpic:       { min: 5, max: 10 },
    streakBonus:       { per3: 1, per7: 3, per30: 10 },
    referral:          10,
    maxDailyEarning:   20,
  },

  xp: {
    matchWin:          { base: 30, variance: 10 },
    matchLoss:         { base: 10, variance: 5 },
    pvpWin:            50,
    pvpLoss:           15,
    dailyChallenge:    { min: 20, max: 60 },
    tournamentWin:     200,
    levelThreshold:    (level: number) => Math.floor(100 * Math.pow(1.4, level - 1)),
  },

  elo: {
    base:              30,
    maxGainPerMatch:   200,
    minElo:            100,
    kFactor:           32,
    provisionalGames:  10,
    floorByLeague: {
      training:  100,
      bronze:    400,
      silver:    800,
      gold:      1200,
      platinum:  1600,
      diamond:   2000,
      elite:     2500,
    },
  },

  fame: {
    pvpWin:            2,
    tournamentWin:     15,
    tournamentTop3:    5,
    levelUp:           3,
    decayPerWeek:      1,
  },

  antiCheat: {
    maxScorePerSecond:  50,
    maxCoinsPerTx:      10_000,
    maxEloGainPerMatch: 200,
    maxDailyCoins:      500,
    maxMatchesPerHour:  30,
    minMatchDuration:   15,
    suspectAccuracy:    0.99,
    suspectDuration:    30,
  },

  economy: {
    startingCoins:      100,
    startingXp:         0,
    startingElo:        1000,
    leagueUnlockCost: {
      bronze:           200,
      silver:           500,
      gold:             1000,
      platinum:         2000,
      diamond:          5000,
      elite:            10000,
    },
  },

  store: {
    lootBoxPrices: {
      common:   50,
      rare:     150,
      epic:     400,
    },
    xpBoostPrice:   200,
    xpBoostHours:   24,
  },

  pi: {
    vipPrices: {
      silver:   1.0,
      gold:     2.5,
      diamond:  5.0,
    },
    tournamentEntry: 0.5,
    coinsPerPi: 250,
  },
} as const;

export type Balance = typeof BALANCE;

export function calcMatchDN(won: boolean, streakBonus = 0): number {
  const base  = won ? BALANCE.dn.matchWin.base : BALANCE.dn.matchLoss.base;
  const var_  = won ? BALANCE.dn.matchWin.variance : BALANCE.dn.matchLoss.variance;
  const raw   = base + Math.floor(Math.random() * var_) + streakBonus;
  return Math.min(raw, BALANCE.dn.maxDailyEarning);
}
/** @deprecated use calcMatchDN */
export const calcMatchCoins = calcMatchDN;

export function calcMatchXp(won: boolean): number {
  const base = won ? BALANCE.xp.matchWin.base : BALANCE.xp.matchLoss.base;
  const var_ = won ? BALANCE.xp.matchWin.variance : BALANCE.xp.matchLoss.variance;
  return base + Math.floor(Math.random() * var_);
}

export function xpForLevel(level: number): number {
  return BALANCE.xp.levelThreshold(level);
}
