// ─────────────────────────────────────────────
// 🏆 SkillLeague Tournament Engine
// ─────────────────────────────────────────────

export interface TournamentPlayer {
  id: string;
  username: string;
}

export interface TournamentMatch {
  id: string;
  player1: TournamentPlayer;
  player2: TournamentPlayer;
  winnerId?: string;
}

export interface Tournament {
  id: string;
  name: string;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  active: boolean;
}

export function createTournament(
  id: string,
  name: string,
  players: TournamentPlayer[]
): Tournament {
  const matches: TournamentMatch[] = [];

  for (let i = 0; i < players.length; i += 2) {
    if (!players[i + 1]) break;

    matches.push({
      id: `match_${i}`,
      player1: players[i],
      player2: players[i + 1],
    });
  }

  return {
    id,
    name,
    players,
    matches,
    active: true,
  };
}

export function setMatchWinner(
  tournament: Tournament,
  matchId: string,
  winnerId: string
): Tournament {
  return {
    ...tournament,
    matches: tournament.matches.map((m) =>
      m.id === matchId
        ? {
            ...m,
            winnerId,
          }
        : m
    ),
  };
}

export function getTournamentWinners(
  tournament: Tournament
) {
  return tournament.matches
    .filter((m) => m.winnerId)
    .map((m) => m.winnerId);
}