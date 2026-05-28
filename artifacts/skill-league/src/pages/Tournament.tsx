import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Trophy, Zap } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import GuestBanner from '@/components/GuestBanner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createTournamentBracket,
  TournamentBracket,
  TournamentPlayer,
  TournamentMatch,
  advanceTournamentRound,
  simulateBotMatch,
} from '@/lib/pvp-engine';
import { getLevelTitle } from '@/lib/xp';
import WinAnimation from '@/components/WinAnimation';
import { generateChallenge, LEAGUES, LeagueId, COLORS } from '@/lib/game-engine';
import { getBotAccuracy, getBotReactionMs, scorePvpAnswer } from '@/lib/pvp-engine';

type Phase = 'select' | 'bracket' | 'battle' | 'round_result' | 'finished';

const TOURNAMENT_SIZES = [
  { size: 8 as const,  label: '8 Players',  icon: '⚔️',  entry: 100, coins: 500,  xp: 300  },
  { size: 16 as const, label: '16 Players', icon: '🏆',  entry: 200, coins: 1000, xp: 600  },
];

const PLACE_LABELS: Record<number, string> = { 1: '🥇 Champion', 2: '🥈 Runner-up', 3: '🥉 Third Place', 4: '4th Place' };

export default function Tournament() {
  const { username, coins, level, recordTournamentWin, spendCoins, isGuest } = useGame();
  const [phase, setPhase] = useState<Phase>('select');
  const [bracket, setBracket] = useState<TournamentBracket | null>(null);
  const [selectedSize, setSelectedSize] = useState<8 | 16>(8);
  const [currentMatch, setCurrentMatch] = useState<TournamentMatch | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [challenge, setChallenge] = useState<ReturnType<typeof generateChallenge> | null>(null);
  const [roundFeedback, setRoundFeedback] = useState<'none' | 'good' | 'bad'>('none');
  const [playerPlace, setPlayerPlace] = useState<number | null>(null);
  const [showWin, setShowWin] = useState(false);
  const [eliminated, setEliminated] = useState(false);
  const [battleRef] = useState<{
    done: boolean; pScore: number; oScore: number;
    timer: ReturnType<typeof setInterval> | null;
    botTimer: ReturnType<typeof setTimeout> | null;
  }>({ done: false, pScore: 0, oScore: 0, timer: null, botTimer: null });

  const clearBattleTimers = () => {
    if (battleRef.timer) clearInterval(battleRef.timer);
    if (battleRef.botTimer) clearTimeout(battleRef.botTimer);
  };

  const startTournament = (size: 8 | 16) => {
    const cfg = TOURNAMENT_SIZES.find(s => s.size === size)!;
    if (!spendCoins(cfg.entry)) return;
    const b = createTournamentBracket(username, level, size);
    setBracket(b);
    setPhase('bracket');
  };

  const findPlayerMatch = (b: TournamentBracket): TournamentMatch | undefined =>
    b.matches.find(m => m.round === b.currentRound && !m.played &&
      (m.playerA?.isPlayer || m.playerB?.isPlayer));

  const startNextBattle = (b: TournamentBracket) => {
    const match = findPlayerMatch(b);
    if (!match) {
      const allPlayed = b.matches.filter(m => m.round === b.currentRound).every(m => m.played);
      if (allPlayed) {
        const advanced = advanceTournamentRound(b);
        setBracket(advanced);
        if (advanced.champion) {
          const isWinner = advanced.champion.isPlayer;
          setPlayerPlace(isWinner ? 1 : 2);
          setPhase('finished');
          if (isWinner) { setShowWin(true); }
          const cfg = TOURNAMENT_SIZES.find(s => s.size === selectedSize)!;
          const coinsReward = isWinner ? cfg.coins : Math.floor(cfg.coins * 0.3);
          const xpReward = isWinner ? cfg.xp : Math.floor(cfg.xp * 0.4);
          recordTournamentWin(isWinner ? 1 : 2, coinsReward, xpReward);
        } else {
          setTimeout(() => startNextBattle(advanced), 500);
        }
      }
      return;
    }

    // Simulate bot matches first
    let updated = { ...b, matches: b.matches.map(m => {
      if (m.round === b.currentRound && !m.played && !m.playerA?.isPlayer && !m.playerB?.isPlayer) {
        const winner = simulateBotMatch(m.playerA!, m.playerB!);
        return { ...m, winner, played: true };
      }
      return m;
    })};
    setBracket(updated);

    const playerMatch = updated.matches.find(m =>
      m.round === updated.currentRound && !m.played &&
      (m.playerA?.isPlayer || m.playerB?.isPlayer));

    if (playerMatch) {
      setCurrentMatch(playerMatch);
      setPlayerScore(0);
      setBotScore(0);
      setRoundFeedback('none');
      battleRef.done = false;
      battleRef.pScore = 0;
      battleRef.oScore = 0;
      setPhase('battle');

      let t = 45;
      setTimeLeft(t);
      clearBattleTimers();
      battleRef.timer = setInterval(() => {
        t--;
        setTimeLeft(t);
        if (t <= 0) endBattle(updated, playerMatch);
      }, 1000);

      spawnNextChallenge();
    } else {
      const allPlayed = updated.matches.filter(m => m.round === updated.currentRound).every(m => m.played);
      if (allPlayed) {
        const advanced = advanceTournamentRound(updated);
        setBracket(advanced);
        setTimeout(() => startNextBattle(advanced), 500);
      }
    }
  };

  const spawnNextChallenge = () => {
    const c = generateChallenge(3);
    setChallenge(c);
    setRoundFeedback('none');

    const acc = getBotAccuracy('silver');
    const ms = getBotReactionMs('silver', c.type);
    const correct = Math.random() < acc;

    battleRef.botTimer = setTimeout(() => {
      if (battleRef.done) return;
      const pts = scorePvpAnswer(correct, ms, 2000, 0, c.type);
      battleRef.oScore = Math.max(0, battleRef.oScore + pts);
      setBotScore(battleRef.oScore);
    }, ms);
  };

  const endBattle = (b: TournamentBracket, match: TournamentMatch) => {
    if (battleRef.done) return;
    battleRef.done = true;
    clearBattleTimers();

    const playerWon = battleRef.pScore >= battleRef.oScore;
    const opponent = match.playerA?.isPlayer ? match.playerB! : match.playerA!;
    const playerT = match.playerA?.isPlayer ? match.playerA! : match.playerB!;

    const updatedMatch = { ...match, winner: playerWon ? playerT : opponent, played: true };
    const updatedBracket: TournamentBracket = {
      ...b,
      matches: b.matches.map(m => m.id === match.id ? updatedMatch : m),
    };

    if (!playerWon) {
      setEliminated(true);
      const roundsDone = b.currentRound;
      const totalRounds = b.rounds;
      const place = Math.pow(2, totalRounds - roundsDone + 1);
      setPlayerPlace(place);
      setBracket(updatedBracket);
      setPhase('finished');
      recordTournamentWin(place, 0, 20);
    } else {
      setBracket(updatedBracket);
      setPhase('bracket');
      setTimeout(() => startNextBattle(updatedBracket), 800);
    }
  };

  const handleTap = (color: { id: string; hex: string }) => {
    if (battleRef.done || !challenge || challenge.type === 'memory') return;
    const correct = color.id === (challenge as any).target.id;
    setRoundFeedback(correct ? 'good' : 'bad');
    const pts = scorePvpAnswer(correct, 500, 2000, 0, challenge.type);
    battleRef.pScore = Math.max(0, battleRef.pScore + pts);
    setPlayerScore(battleRef.pScore);
    setTimeout(() => { if (!battleRef.done) spawnNextChallenge(); }, 400);
  };

  const { title: levelTitle, color: levelColor } = getLevelTitle(level);

  // ── Phase: Select ──────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="min-h-screen bg-background flex flex-col p-5 max-w-md mx-auto pb-10">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/"><button className="p-2 rounded-full hover:bg-card"><ArrowLeft className="w-5 h-5" /></button></Link>
          <h1 className="text-2xl font-bold flex-1">البطولات</h1>
          <Trophy className="w-6 h-6 text-yellow-400" />
        </div>
        <GuestBanner message="البطولات متاحة فقط للأعضاء المسجّلين. سجّل دخولك للمشاركة والتنافس." />

        <div className="bg-card border border-border rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center font-black text-primary">
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-bold">{username}</div>
              <div className="text-sm" style={{ color: levelColor }}>Lv.{level} · {levelTitle}</div>
            </div>
            <div className="ml-auto text-yellow-400 font-bold text-sm">{coins} 🪙</div>
          </div>
        </div>

        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Choose Tournament</h2>
        <div className="space-y-3">
          {TOURNAMENT_SIZES.map(t => {
            const canAfford = coins >= t.entry;
            return (
              <button
                key={t.size}
                onClick={() => { setSelectedSize(t.size); startTournament(t.size); }}
                disabled={!canAfford}
                className="w-full p-5 rounded-2xl border border-border bg-card text-left transition-all active:scale-[0.98] disabled:opacity-40 hover:border-primary/40"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-2xl mb-1">{t.icon}</div>
                    <div className="font-black text-xl">{t.label}</div>
                    <div className="text-sm text-muted-foreground">Knockout bracket · 60s rounds</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-1">Entry</div>
                    <div className="font-bold text-yellow-400">{t.entry} 🪙</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-background rounded-xl p-2 text-center">
                    <div className="font-black text-green-400">{t.coins} 🪙</div>
                    <div className="text-xs text-muted-foreground">1st Prize</div>
                  </div>
                  <div className="bg-background rounded-xl p-2 text-center">
                    <div className="font-black text-primary">+{t.xp} XP</div>
                    <div className="text-xs text-muted-foreground">Winner XP</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 bg-card border border-border rounded-2xl p-4">
          <div className="text-xs font-bold text-muted-foreground uppercase mb-2">How it Works</div>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div>🎯 Knockout format — lose once, you're out</div>
            <div>⚡ Each round is a 45-second PvP battle</div>
            <div>🏆 Win the bracket to claim the prize</div>
            <div>🤖 Bot opponents simulate real players</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: Bracket ─────────────────────────────────────────────────────────
  if (phase === 'bracket' && bracket) {
    const roundMatches = bracket.matches.filter(m => m.round === bracket.currentRound);
    const playerMatch = findPlayerMatch(bracket);

    return (
      <div className="min-h-screen bg-background flex flex-col p-5 max-w-md mx-auto pb-10">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setPhase('select')} className="p-2 rounded-full hover:bg-card">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">Round {bracket.currentRound}</h1>
          <div className="text-sm text-muted-foreground">{bracket.players.length} players</div>
        </div>

        <div className="space-y-3 mb-5">
          {roundMatches.map(match => {
            const isPlayerMatch = match.playerA?.isPlayer || match.playerB?.isPlayer;
            return (
              <div
                key={match.id}
                className="bg-card border rounded-2xl p-4"
                style={{ borderColor: isPlayerMatch ? 'hsl(var(--primary)/0.5)' : 'hsl(var(--border))' }}
              >
                <div className="flex items-center gap-2">
                  <MatchSlot player={match.playerA} winner={match.winner} />
                  <div className="text-sm font-bold text-muted-foreground">VS</div>
                  <MatchSlot player={match.playerB} winner={match.winner} />
                </div>
                {match.played && match.winner && (
                  <div className="text-xs text-center mt-2 text-muted-foreground">
                    Winner: <span className="font-bold" style={{ color: match.winner.isPlayer ? 'hsl(var(--primary))' : '#FF3A5E' }}>
                      {match.winner.name}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {playerMatch && (
          <button
            onClick={() => startNextBattle(bracket)}
            className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" /> Fight Now!
          </button>
        )}
      </div>
    );
  }

  // ── Phase: Battle ──────────────────────────────────────────────────────────
  if (phase === 'battle' && currentMatch && challenge) {
    const opponent = currentMatch.playerA?.isPlayer ? currentMatch.playerB : currentMatch.playerA;
    const c = challenge;
    const isFeedback = roundFeedback !== 'none';

    return (
      <div className="min-h-screen bg-background flex flex-col select-none"
        style={{
          background: roundFeedback === 'good' ? 'radial-gradient(circle,#2EE87A15,hsl(var(--background)) 70%)' :
            roundFeedback === 'bad' ? 'radial-gradient(circle,#FF3A5E15,hsl(var(--background)) 70%)' :
            'hsl(var(--background))',
          transition: 'background 0.2s',
        }}
      >
        <div className="px-4 pt-4 pb-2 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">{username}</div>
              <div className="text-2xl font-black text-primary tabular-nums">{playerScore}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black tabular-nums" style={{ color: timeLeft <= 10 ? '#FF3A5E' : undefined }}>{timeLeft}</div>
              <div className="text-xs text-yellow-500 font-bold uppercase">TOURNAMENT</div>
            </div>
            <div className="flex-1 text-right">
              <div className="text-xs text-muted-foreground">{opponent?.name}</div>
              <div className="text-2xl font-black text-red-400 tabular-nums">{botScore}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6 gap-6">
          {c.type !== 'memory' && (
            <>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {c.type === 'reaction' ? 'TAP THIS' : 'MATCH THIS'}
              </div>
              <div className="w-28 h-28 rounded-3xl"
                style={{ backgroundColor: (c as any).target.hex, boxShadow: `0 0 50px ${(c as any).target.hex}88` }} />
              <div className="grid gap-3 w-full max-w-xs"
                style={{ gridTemplateColumns: `repeat(${Math.min((c as any).options.length, 2)}, 1fr)` }}>
                {(c as any).options.map((opt: { id: string; hex: string }) => (
                  <button
                    key={opt.id}
                    onClick={() => handleTap(opt)}
                    disabled={isFeedback}
                    className="h-20 rounded-2xl active:scale-95 transition-transform disabled:opacity-60"
                    style={{ backgroundColor: opt.hex, boxShadow: `0 4px 20px ${opt.hex}55` }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Phase: Finished ────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const cfg = TOURNAMENT_SIZES.find(s => s.size === selectedSize)!;
    const won = playerPlace === 1;
    const place = playerPlace ?? 4;
    const placeLabel = PLACE_LABELS[place] ?? `Top ${place}`;
    const coinsWon = won ? cfg.coins : place === 2 ? Math.floor(cfg.coins * 0.3) : 0;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5 text-center">
        <WinAnimation show={showWin} label="CHAMPION!" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-4">
          <div className="text-6xl">{won ? '🏆' : eliminated ? '💀' : '🎖️'}</div>
          <div className="text-3xl font-black">{placeLabel}</div>
          <div className="text-muted-foreground text-sm">Tournament Complete!</div>

          {coinsWon > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
              <div className="text-2xl font-black text-yellow-400">+{coinsWon} 🪙</div>
              <div className="text-sm text-muted-foreground">Prize Coins</div>
            </div>
          )}

          {bracket && (
            <div className="bg-card border border-border rounded-2xl p-4 text-left">
              <div className="text-xs font-bold text-muted-foreground uppercase mb-2">Final Results</div>
              {bracket.matches.filter(m => m.played).slice(-4).map(m => (
                <div key={m.id} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Round {m.round}</span>
                  <span className="font-bold" style={{ color: m.winner?.isPlayer ? 'hsl(var(--primary))' : '#FF3A5E' }}>
                    {m.winner?.name ?? '-'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={() => { setPhase('select'); setBracket(null); setShowWin(false); setEliminated(false); }}
              className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-lg active:scale-95"
            >
              New Tournament
            </button>
            <Link href="/">
              <button className="w-full h-12 rounded-2xl border border-border text-muted-foreground font-medium active:scale-95">
                Home
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}

function MatchSlot({ player, winner }: { player: TournamentPlayer | null; winner: TournamentPlayer | null }) {
  if (!player) return <div className="flex-1 h-10 rounded-xl bg-card/50 border border-dashed border-border" />;
  const isWinner = winner?.id === player.id;
  const isLoser = winner && winner.id !== player.id;
  return (
    <div className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all"
      style={{
        borderColor: isWinner ? (player.isPlayer ? 'hsl(var(--primary)/0.5)' : '#FF3A5E40') : 'hsl(var(--border))',
        backgroundColor: isWinner ? (player.isPlayer ? 'hsl(var(--primary)/0.1)' : '#FF3A5E10') : 'transparent',
        opacity: isLoser ? 0.4 : 1,
      }}>
      <div className="text-xs font-black truncate flex-1" style={{ color: player.isPlayer ? 'hsl(var(--primary))' : undefined }}>
        {player.name}
      </div>
      {isWinner && <span className="text-xs">✓</span>}
    </div>
  );
}
