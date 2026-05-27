import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useParams } from 'wouter';
import { useGame } from '@/contexts/GameContext';
import { LEAGUES, LeagueType, ChallengeType, calculateScore } from '@/lib/game-engine';
import { Trophy, X } from 'lucide-react';

export default function Game() {
  const { league } = useParams<{ league: string }>();
  const [, setLocation] = useLocation();
  const { updateCurrency, updateHighScore, setLastResult, trainingCoins, entryTokens } = useGame();
  
  const config = LEAGUES[league as LeagueType];
  
  if (!config) {
    setLocation('/');
    return null;
  }

  const [timeLeft, setTimeLeft] = useState(config.duration);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Game loop/timer
  useEffect(() => {
    // Basic implementation to avoid complexity in this mock
    setIsPlaying(true);
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          setIsPlaying(false);
          finishGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const finishGame = () => {
    // Pay entry cost and give rewards
    let coinsEarned = 0;
    let tokensEarned = 0;
    
    if (config.entryCostType === 'coins') updateCurrency(-config.entryCost, 0);
    if (config.entryCostType === 'tokens') updateCurrency(0, -config.entryCost);

    if (league === 'training' || league === 'easy') coinsEarned = Math.floor(score / 100) + 10;
    if (league === 'ranked' || league === 'elite') tokensEarned = Math.floor(score / 1000) + 1;

    updateCurrency(coinsEarned, tokensEarned);
    updateHighScore(league as string, score);
    setLastResult(score, 100, coinsEarned, tokensEarned); // accuracy fixed at 100 for mock
    setLocation('/results');
  };

  const handleTap = () => {
    if (!isPlaying) return;
    setScore(s => s + calculateScore(500, streak));
    setStreak(s => s + 1);
  };

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
        <div className="text-3xl font-mono font-black">{timeLeft}s</div>
        <div className="text-xl font-bold bg-card px-4 py-2 rounded-full border">{score} pts</div>
        <div className="text-lg font-bold text-orange-500 flex items-center gap-1">
          {streak > 2 && <span className="animate-pulse">🔥 {streak}</span>}
        </div>
      </div>

      <div className="w-full max-w-sm aspect-square bg-card rounded-3xl border flex items-center justify-center cursor-pointer shadow-2xl active:scale-95 transition-transform" onClick={handleTap}>
        {/* Placeholder for challenge visual */}
        <div className="w-32 h-32 bg-primary rounded-full animate-pulse shadow-[0_0_50px_rgba(var(--primary),0.5)]"></div>
      </div>
    </div>
  );
}
