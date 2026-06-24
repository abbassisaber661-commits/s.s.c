// ─────────────────────────────────────────────
// 🎯 SkillLeague Daily Missions Engine
// ─────────────────────────────────────────────

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardCoins: number;
  completed: boolean;
}

export function createDailyMissions(): DailyMission[] {
  return [
    {
      id: "play_3_matches",
      title: "Daily Competitor",
      description: "Play 3 matches",
      target: 3,
      progress: 0,
      rewardCoins: 100,
      completed: false,
    },

    {
      id: "win_2_matches",
      title: "Winning Spirit",
      description: "Win 2 matches",
      target: 2,
      progress: 0,
      rewardCoins: 150,
      completed: false,
    },

    {
      id: "answer_20_questions",
      title: "Knowledge Hunter",
      description: "Answer 20 questions",
      target: 20,
      progress: 0,
      rewardCoins: 200,
      completed: false,
    },
  ];
}

export function updateMission(
  mission: DailyMission,
  amount = 1
): DailyMission {
  const progress = Math.min(
    mission.progress + amount,
    mission.target
  );

  return {
    ...mission,
    progress,
    completed: progress >= mission.target,
  };
}