import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Trophy, Zap } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import GuestBanner from '@/components/GuestBanner';
import { motion } from 'framer-motion';
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
import { generateChallenge, COLORS } from '@/lib/game-engine';
import { getBotAccuracy, getBotReactionMs, scorePvpAnswer } from '@/lib/pvp-engine';

type Phase = 'select' | 'bracket' | 'battle' | 'finished';

const TOURNAMENT_SIZES = [
  { size: 8 as const,  label: '8 Players',  icon: '⚔️',  entry: 100, coins: 500,  xp: 300  },
  { size: 16 as const, label: '16 Players', icon: '🏆',  entry: 200, coins: 1000, xp: 600  },
];

const PLACE_LABELS: Record<number, string> = { 1: '🥇 Champion', 2: '🥈 Runner-up', 3: '🥉 Third Place', 4: '4th Place' };
const PLACE_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

// ── Standings builder ─────────────────────────────────────────────────────────
function buildStandings(bracket: TournamentBracket): Array<{ player: TournamentPlayer; place: number }> {
  const byPlayer = new Map<string, { lastRound: number; won: boolean; player: TournamentPlayer }>();

  for (const match of bracket.matches) {
    if (!match.played || !match.winner) continue;
    const winner = match.winner;
    const loser  = match.playerA?.id === winner.id ? match.playerB : match.playerA;

    const curW = byPlayer.get(winner.id);
    if (!curW || match.round > curW.lastRound)
      byPlayer.set(winner.id, { lastRound: match.round, won: true, player: winner });

    if (loser) {
      const curL = byPlayer.get(loser.id);
      if (!curL || match.round > curL.lastRound)
        byPlayer.set(loser.id, { lastRound: match.round, won: false, player: loser });
    }
  }

  const rows = [...byPlayer.values()].sort((a, b) => {
    if (a.lastRound !== b.lastRound) return b.lastRound - a.lastRound;
    return a.won ? -1 : 1;
  });

  return rows.map((r, i) => ({ player: r.player, place: i + 1 }));
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Tournament() {
  const { username, coins, level, recordTournamentWin, spendCoins, isGuest } = useGame();
  const [phase, setPhase]             = useState<Phase>('select');
  const [bracket, setBracket]         = useState<TournamentBracket | null>(null);
  const [selectedSize, setSelectedSize] = useState<8 | 16>(8);
  const [currentMatch, setCurrentMatch] = useState<TournamentMatch | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore]       = useState(0);
  const [timeLeft, setTimeLeft]       = useState(45);
  const [challenge, setChallenge]     = useState<ReturnType<typeof generateChallenge> | null>(null);
  const [roundFeedback, setRoundFeedback] = useState<'none' | 'good' | 'bad'>('none');
  const [playerPlace, setPlayerPlace] = useState<number | null>(null);
  const [showWin, setShowWin]         = useState(false);
  const [eliminated, setEliminated]   = useState(false);

  // Memory-challenge state
  const [memoryPhase, setMemoryPhase] = useState<'show' | 'input'>('input');
  const [memoryInput, setMemoryInput] = useState<string[]>([]);

  const [battleRef] = useState<{
    done: boolean; pScore: number; oScore: number;
    timer:        ReturnType<typeof setInterval> | null;
    botTimer:     ReturnType<typeof setTimeout>  | null;
    memShowTimer: ReturnType<typeof setTimeout>  | null;
  }>({ done: false, pScore: 0, oScore: 0, timer: null, botTimer: null, memShowTimer: null });

  const clearBattleTimers = () => {
    if (battleRef.timer)        clearInterval(battleRef.timer);
    if (battleRef.botTimer)     clearTimeout(battleRef.botTimer);
    if (battleRef.memShowTimer) clearTimeout(battleRef.memShowTimer);
  };

  // Cleanup all timers when component unmounts (prevents setState on unmounted component)
  useEffect(() => {
    return () => { clearBattleTimers(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          const isWinner   = advanced.champion.isPlayer;
          setPlayerPlace(isWinner ? 1 : 2);
          setPhase('finished');
          if (isWinner) setShowWin(true);
          const cfg        = TOURNAMENT_SIZES.find(s => s.size === selectedSize)!;
          const coinsReward = isWinner ? cfg.coins : Math.floor(cfg.coins * 0.3);
          const xpReward   = isWinner ? cfg.xp   : Math.floor(cfg.xp   * 0.4);
          recordTournamentWin(isWinner ? 1 : 2, coinsReward, xpReward);
        } else {
          setTimeout(() => startNextBattle(advanced), 500);
        }
      }
      return;
    }

    // Simulate bot-vs-bot matches first
    let updated = {
      ...b,
      matches: b.matches.map(m => {
        if (m.round === b.currentRound && !m.played && !m.playerA?.isPlayer && !m.playerB?.isPlayer) {
          const winner = simulateBotMatch(m.playerA!, m.playerB!);
          return { ...m, winner, played: true };
        }
        return m;
      }),
    };
    setBracket(updated);

    const playerMatch = updated.matches.find(m =>
      m.round === updated.currentRound && !m.played &&
      (m.playerA?.isPlayer || m.playerB?.isPlayer));

    if (playerMatch) {
      setCurrentMatch(playerMatch);
      setPlayerScore(0);
      setBotScore(0);
      setRoundFeedback('none');
      setMemoryInput([]);
      battleRef.done    = false;
      battleRef.pScore  = 0;
      battleRef.oScore  = 0;
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
    setMemoryInput([]);

    if (c.type === 'memory') {
      const seq    = (c as any).sequence as { id: string; hex: string }[];
      const showMs = Math.max(1500, seq.length * 600);
      setMemoryPhase('show');
      if (battleRef.memShowTimer) clearTimeout(battleRef.memShowTimer);
      battleRef.memShowTimer = setTimeout(() => {
        if (!battleRef.done) setMemoryPhase('input');
      }, showMs);
    } else {
      setMemoryPhase('input');
    }

    const acc     = getBotAccuracy('silver');
    const ms      = getBotReactionMs('silver', c.type);
    const correct = Math.random() < acc;

    if (battleRef.botTimer) clearTimeout(battleRef.botTimer);
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

    const playerWon  = battleRef.pScore >= battleRef.oScore;
    const opponent   = match.playerA?.isPlayer ? match.playerB! : match.playerA!;
    const playerT    = match.playerA?.isPlayer ? match.playerA! : match.playerB!;

    const updatedMatch: TournamentMatch = { ...match, winner: playerWon ? playerT : opponent, played: true };
    const updatedBracket: TournamentBracket = {
      ...b,
      matches: b.matches.map(m => m.id === match.id ? updatedMatch : m),
    };

    if (!playerWon) {
      setEliminated(true);
      const roundsDone  = b.currentRound;
      const totalRounds = b.rounds;
      const place       = Math.pow(2, totalRounds - roundsDone + 1);
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

  // ── Color challenge handler ───────────────────────────────────────────────
  const handleTap = (color: { id: string; hex: string }) => {
    if (battleRef.done || !challenge || challenge.type === 'memory') return;
    const correct = color.id === (challenge as any).target.id;
    setRoundFeedback(correct ? 'good' : 'bad');
    const pts = scorePvpAnswer(correct, 500, 2000, 0, challenge.type);
    battleRef.pScore = Math.max(0, battleRef.pScore + pts);
    setPlayerScore(battleRef.pScore);
    setTimeout(() => { if (!battleRef.done) spawnNextChallenge(); }, 400);
  };

  // ── Memory challenge handler ──────────────────────────────────────────────
  const handleMemoryTap = (colorId: string) => {
    if (battleRef.done || !challenge || challenge.type !== 'memory' || memoryPhase !== 'input') return;
    const seq      = (challenge as any).sequence as { id: string; hex: string }[];
    const newInput = [...memoryInput, colorId];
    setMemoryInput(newInput);

    if (newInput.length === seq.length) {
      const allCorrect = newInput.every((id, i) => id === seq[i].id);
      setRoundFeedback(allCorrect ? 'good' : 'bad');
      const pts = scorePvpAnswer(allCorrect, 800, 2000, 0, 'memory');
      battleRef.pScore = Math.max(0, battleRef.pScore + pts);
      setPlayerScore(battleRef.pScore);
      setTimeout(() => { if (!battleRef.done) spawnNextChallenge(); }, 500);
    }
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
                    <div className="text-sm text-muted-foreground">Knockout bracket · 45s rounds</div>
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
            <div>🧠 Challenges: color reaction, decision & memory</div>
            <div>📈 Results affect your ELO &amp; League Points</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: Bracket ─────────────────────────────────────────────────────────
  if (phase === 'bracket' && bracket) {
    const roundMatches = bracket.matches.filter(m => m.round === bracket.currentRound);
    const playerMatch  = findPlayerMatch(bracket);

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
    const opponent    = currentMatch.playerA?.isPlayer ? currentMatch.playerB : currentMatch.playerA;
    const c           = challenge;
    const isFeedback  = roundFeedback !== 'none';
    const isColorType = c.type === 'reaction' || c.type === 'decision';
    const isMemory    = c.type === 'memory';
    const memSeq      = isMemory ? ((c as any).sequence as { id: string; hex: string }[]) : [];

    return (
      <div
        className="min-h-screen bg-background flex flex-col select-none"
        style={{
          background:
            roundFeedback === 'good' ? 'radial-gradient(circle,#2EE87A15,hsl(var(--background)) 70%)' :
            roundFeedback === 'bad'  ? 'radial-gradient(circle,#FF3A5E15,hsl(var(--background)) 70%)' :
            'hsl(var(--background))',
          transition: 'background 0.2s',
        }}
      >
        {/* Score Bar */}
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

        {/* Challenge Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6 gap-6">

          {/* Color tap challenges */}
          {isColorType && (
            <>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {c.type === 'reaction' ? 'TAP THIS' : 'MATCH THIS'}
              </div>
              <div
                className="w-28 h-28 rounded-3xl"
                style={{ backgroundColor: (c as any).target.hex, boxShadow: `0 0 50px ${(c as any).target.hex}88` }}
              />
              <div
                className="grid gap-3 w-full max-w-xs"
                style={{ gridTemplateColumns: `repeat(${Math.min((c as any).options.length, 2)}, 1fr)` }}
              >
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

          {/* Memory sequence challenge */}
          {isMemory && (
            <>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {memoryPhase === 'show' ? '⚡ MEMORIZE' : '🔁 REPEAT THE SEQUENCE'}
              </div>

              {memoryPhase === 'show' ? (
                /* Show phase — display the sequence to memorize */
                <div className="flex gap-3 flex-wrap justify-center">
                  {memSeq.map((col, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.15, type: 'spring', stiffness: 300 }}
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-lg"
                      style={{ backgroundColor: col.hex, boxShadow: `0 0 24px ${col.hex}99` }}
                    >
                      {i + 1}
                    </motion.div>
                  ))}
                </div>
              ) : (
                /* Input phase — player taps the sequence */
                <>
                  {/* Progress dots */}
                  <div className="flex gap-2 justify-center">
                    {memSeq.map((col, i) => {
                      const tapped = memoryInput[i];
                      const tapColor = tapped ? COLORS.find(cc => cc.id === tapped)?.hex : undefined;
                      return (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full border-2 transition-all duration-200"
                          style={{
                            backgroundColor: tapColor ?? 'transparent',
                            borderColor:     tapColor ?? '#555',
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Color buttons */}
                  <div className="grid grid-cols-5 gap-2 w-full max-w-xs">
                    {COLORS.map(col => (
                      <button
                        key={col.id}
                        onClick={() => handleMemoryTap(col.id)}
                        disabled={memoryInput.length >= memSeq.length || isFeedback}
                        className="h-14 rounded-2xl active:scale-95 transition-transform disabled:opacity-30"
                        style={{ backgroundColor: col.hex, boxShadow: `0 4px 16px ${col.hex}55` }}
                      />
                    ))}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {memoryInput.length} / {memSeq.length} tapped
                  </div>
                </>
              )}
            </>
          )}

          {/* Fallback — should never happen, but prevents blank screen */}
          {!isColorType && !isMemory && (
            <div className="text-muted-foreground text-sm text-center px-8">
              Loading challenge…
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Phase: Finished ────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const cfg       = TOURNAMENT_SIZES.find(s => s.size === selectedSize)!;
    const won       = playerPlace === 1;
    const place     = playerPlace ?? 4;
    const placeLabel = PLACE_LABELS[place] ?? `Top ${place}`;
    const coinsWon  = won ? cfg.coins : place === 2 ? Math.floor(cfg.coins * 0.3) : 0;
    const standings = bracket ? buildStandings(bracket) : [];

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

          {/* Final Standings */}
          {standings.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4 text-left">
              <div className="text-xs font-bold text-muted-foreground uppercase mb-3">
                🏆 Final Standings
              </div>
              <div className="space-y-1.5">
                {standings.slice(0, Math.min(8, standings.length)).map(({ player, place: p }) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-xl text-sm transition-colors"
                    style={{ backgroundColor: player.isPlayer ? 'hsl(var(--primary)/0.1)' : 'transparent' }}
                  >
                    <span className="w-6 text-center text-xs font-bold">
                      {PLACE_MEDALS[p] ?? p}
                    </span>
                    <span
                      className="flex-1 font-medium truncate"
                      style={{ color: player.isPlayer ? 'hsl(var(--primary))' : undefined }}
                    >
                      {player.name}{player.isPlayer ? ' 👤' : ''}
                    </span>
                    <span className="text-xs text-muted-foreground">Lv.{player.level}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-3 text-xs text-muted-foreground text-left">
            <div className="font-bold text-foreground mb-1">Ranked Rewards</div>
            <div>📈 ELO &amp; LP updated based on your placement</div>
            <div>🌀 Season rank reflects your new ELO</div>
          </div>

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
  const isLoser  = winner && winner.id !== player.id;
  return (
    <div
      className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all"
      style={{
        borderColor:     isWinner ? (player.isPlayer ? 'hsl(var(--primary)/0.5)' : '#FF3A5E40') : 'hsl(var(--border))',
        backgroundColor: isWinner ? (player.isPlayer ? 'hsl(var(--primary)/0.1)' : '#FF3A5E10') : 'transparent',
        opacity: isLoser ? 0.4 : 1,
      }}
    >
      <div className="text-xs font-black truncate flex-1" style={{ color: player.isPlayer ? 'hsl(var(--primary))' : undefined }}>
        {player.name}
      </div>
      {isWinner && <span className="text-xs">✓</span>}
    </div>
  );
}
