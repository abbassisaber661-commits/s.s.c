export interface AiHint {
  id: string;
  icon: string;
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel?: string;
  actionUrl?: string;
}

interface PlayerStats {
  level: number;
  elo: number;
  matchesPlayed: number;
  matchesWon: number;
  pvpWins: number;
  pvpLosses: number;
  pvpWinStreak: number;
  bestStreak: number;
  skillSpeed: number;
  skillAccuracy: number;
  skillMemory: number;
  coins: number;
  tournamentWins: number;
  dailyChallengesCompleted: number;
  xpBoostUntil: number | null;
}

export function generateAiHints(stats: PlayerStats): AiHint[] {
  const hints: AiHint[] = [];

  // Speed vs Accuracy balance
  if (stats.skillSpeed > stats.skillAccuracy + 20) {
    hints.push({
      id: 'slow_down', icon: '🎯',
      title: 'Slow down, aim better',
      body: `Your speed is great (${stats.skillSpeed}) but accuracy lags (${stats.skillAccuracy}). Focus on selecting correct answers — accuracy multiplies your score more than speed.`,
      priority: 'high', actionLabel: 'Play Training', actionUrl: '/league-select',
    });
  }
  if (stats.skillAccuracy > stats.skillSpeed + 25) {
    hints.push({
      id: 'speed_up', icon: '⚡',
      title: 'You can go faster',
      body: `Your accuracy (${stats.skillAccuracy}) is excellent! Push your speed — faster correct answers give massive score bonuses. Try the Silver league to practice pace.`,
      priority: 'medium', actionLabel: 'Try Silver', actionUrl: '/leagues',
    });
  }

  // PvP win rate
  const pvpTotal = stats.pvpWins + stats.pvpLosses;
  if (pvpTotal >= 5) {
    const pvpRate = Math.round((stats.pvpWins / pvpTotal) * 100);
    if (pvpRate < 40) {
      hints.push({
        id: 'pvp_improve', icon: '⚔️',
        title: 'Improve your PvP win rate',
        body: `Win rate: ${pvpRate}%. Against same-ELO opponents, the first correct streak of 3 usually decides the match. Prioritize streak accuracy over total answers.`,
        priority: 'high', actionLabel: 'PvP Ranked', actionUrl: '/pvp',
      });
    } else if (pvpRate > 70) {
      hints.push({
        id: 'pvp_ranked', icon: '🏆',
        title: "You're dominating PvP!",
        body: `${pvpRate}% win rate — impressive. Your ELO should push you to Silver or Gold tier soon. Try tournaments for bigger coin rewards.`,
        priority: 'low', actionLabel: 'Join Tournament', actionUrl: '/tournament',
      });
    }
  }

  // Level vs ELO gap
  if (stats.level < 10 && stats.matchesPlayed > 20) {
    hints.push({
      id: 'earn_xp', icon: '⬆️',
      title: 'Boost your level with XP',
      body: `You've played ${stats.matchesPlayed} matches but are only level ${stats.level}. Higher levels unlock better rewards. Focus on winning streaks — they give 2×–3× more XP.`,
      priority: 'medium', actionLabel: 'Daily Challenges', actionUrl: '/daily-challenges',
    });
  }

  // Coins advice
  if (stats.coins < 50) {
    hints.push({
      id: 'earn_coins', icon: '💰',
      title: 'Low coins — time to grind',
      body: `You have ${stats.coins} coins. Complete today's daily challenges for a quick +95 coins, then try PvP battles for up to 330 coins per win.`,
      priority: 'high', actionLabel: 'Daily Challenges', actionUrl: '/daily-challenges',
    });
  }

  // Streak advice
  if (stats.bestStreak < 5 && stats.matchesPlayed >= 5) {
    hints.push({
      id: 'build_streak', icon: '🔥',
      title: 'Build your streak',
      body: `Your best streak is ${stats.bestStreak}. Streaks of 5+ give exponential score bonuses. In training mode, answer quickly when you know the answer — hesitation breaks streaks.`,
      priority: 'medium', actionLabel: 'Practice', actionUrl: '/league-select',
    });
  }

  // New player onboarding
  if (stats.matchesPlayed === 0) {
    hints.push({
      id: 'first_match', icon: '🎮',
      title: 'Play your first match!',
      body: 'Start with Training League to earn your first coins and XP. It only takes 60 seconds per match.',
      priority: 'high', actionLabel: 'Play Now', actionUrl: '/leagues',
    });
  }

  // Tournament advice
  if (stats.pvpWins >= 10 && stats.tournamentWins === 0) {
    hints.push({
      id: 'try_tournament', icon: '🏆',
      title: 'Ready for tournaments',
      body: `With ${stats.pvpWins} PvP wins, you're tournament-ready. 1st place pays 1000 coins — that's 3× the best PvP reward.`,
      priority: 'medium', actionLabel: 'Enter Tournament', actionUrl: '/tournament',
    });
  }

  // Memory skill tip
  if (stats.skillMemory < 30 && stats.matchesPlayed >= 3) {
    hints.push({
      id: 'memory_tip', icon: '🧠',
      title: 'Train your memory',
      body: 'Your memory score is low. In word games, recognize common prefixes and suffixes — it makes answers pop instantly. This alone can double your speed.',
      priority: 'low',
    });
  }

  // Sort: high → medium → low
  const order = { high: 0, medium: 1, low: 2 };
  return hints.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 4);
}
