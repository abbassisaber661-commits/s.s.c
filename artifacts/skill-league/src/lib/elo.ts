export function calculateEloChange(leagueId: string, score: number): number {
  if (leagueId === 'training') return 0;
  const cfg: Record<string, { win: number; loss: number; bonus: number; threshold: number }> = {
    bronze: { win: 15, loss: -10, bonus: 8,  threshold: 80  },
    silver: { win: 25, loss: -15, bonus: 12, threshold: 180 },
    elite:  { win: 40, loss: -20, bonus: 20, threshold: 350 },
  };
  const c = cfg[leagueId];
  if (!c) return 0;
  if (score <= 0) return c.loss;
  return c.win + (score >= c.threshold ? c.bonus : 0);
}

export function computeTitle(elo: number, matchesPlayed: number, skillMemory: number, skillSpeed: number): string {
  if (elo >= 1500) return '👑 Champion FC';
  if (elo >= 1300) return '⚔️ Pro FC';
  if (skillMemory >= 88) return '🧠 Memory King FC';
  if (skillSpeed >= 88) return '⚡ Speed Master FC';
  if (matchesPlayed >= 50) return '💪 Iron Will FC';
  if (elo >= 1100) return '⭐ Veteran FC';
  return '🎮 Rookie FC';
}

export function eloTier(elo: number): { label: string; color: string } {
  if (elo >= 1500) return { label: 'CHAMPION', color: '#FFD700' };
  if (elo >= 1300) return { label: 'PRO',      color: '#B44FFF' };
  if (elo >= 1100) return { label: 'VETERAN',  color: '#3AB4FF' };
  return                   { label: 'ROOKIE',  color: '#A8A9AD' };
}
