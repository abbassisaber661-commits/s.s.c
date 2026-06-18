import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import type { BotDifficulty } from "@/lib/matchmaking";

export interface PvpPlayerInfo { name: string; level: number; elo: number; }

export interface MatchFoundEvent {
  roomId: string;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  playerA: PvpPlayerInfo;
  playerB: PvpPlayerInfo;
}

export interface RoundNewEvent {
  challenge: {
    id: string;
    type: string;
    target: { id: string; name: string; hex: string };
    displayColor: { id: string; name: string; hex: string };
    options: { id: string; name: string; hex: string }[];
    question: string;
    timeoutMs: number;
  };
  roundNumber: number;
}

export interface RoundAnsweredEvent {
  by: "A" | "B";
  correct: boolean;
  scoreA: number;
  scoreB: number;
  streakA: number;
  streakB: number;
  elapsedMs: number;
}

export interface MatchEndEvent {
  roomId: string;
  scoreA: number;
  scoreB: number;
  correctA: number;
  correctB: number;
  won: boolean;
  draw: boolean;
  isBot: boolean;
  leagueId: string;
  stake: number;
}

type PvpPhase = "idle" | "searching" | "found" | "countdown" | "playing" | "finished";

export interface PvpSocketState {
  phase: PvpPhase;
  roomId: string | null;
  matchInfo: MatchFoundEvent | null;
  currentChallenge: RoundNewEvent["challenge"] | null;
  scoreA: number;
  scoreB: number;
  streakA: number;
  streakB: number;
  roundNumber: number;
  lastResult: "correct" | "wrong" | null;
  matchEnd: MatchEndEvent | null;
  countdownSec: number;
  anticheatWarning: string | null;
}

export function usePvpSocket(params: {
  playerId: string;
  playerName: string;
  playerLevel: number;
  playerElo: number;
}) {
  const [state, setState] = useState<PvpSocketState>({
    phase: "idle",
    roomId: null,
    matchInfo: null,
    currentChallenge: null,
    scoreA: 0, scoreB: 0,
    streakA: 0, streakB: 0,
    roundNumber: 0,
    lastResult: null,
    matchEnd: null,
    countdownSec: 3,
    anticheatWarning: null,
  });

  const roundStartRef = useRef<number>(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const s = getSocket();

    s.on("matchmaking:searching", () => {
      setState(p => ({ ...p, phase: "searching" }));
    });

    s.on("matchmaking:cancelled", () => {
      setState(p => ({ ...p, phase: "idle" }));
    });

    s.on("match:found", (data: MatchFoundEvent) => {
      setState(p => ({
        ...p,
        phase: "found",
        roomId: data.roomId,
        matchInfo: data,
        scoreA: 0, scoreB: 0,
        streakA: 0, streakB: 0,
      }));

      let c = 3;
      const cd = setInterval(() => {
        c--;
        setState(pp => ({ ...pp, countdownSec: c }));
        if (c <= 0) {
          clearInterval(cd);
          setState(pp => ({ ...pp, phase: "countdown" }));
        }
      }, 800);
    });

    s.on("match:start", () => {
      setState(p => ({ ...p, phase: "playing" }));
    });

    s.on("round:new", (data: RoundNewEvent) => {
      roundStartRef.current = Date.now();
      setState(p => ({
        ...p,
        currentChallenge: data.challenge,
        roundNumber: data.roundNumber,
        lastResult: null,
      }));
    });

    s.on("round:answered", (data: RoundAnsweredEvent) => {
      setState(p => ({
        ...p,
        scoreA: data.scoreA,
        scoreB: data.scoreB,
        streakA: data.streakA,
        streakB: data.streakB,
        lastResult: data.correct ? "correct" : "wrong",
      }));
    });

    s.on("round:bot_answer", (data: { correct: boolean; scoreB: number; streakB: number }) => {
      setState(p => ({
        ...p,
        scoreB: data.scoreB,
        streakB: data.streakB,
      }));
    });

    s.on("round:timeout", (data: { scoreA: number; scoreB: number }) => {
      setState(p => ({
        ...p,
        scoreA: data.scoreA,
        scoreB: data.scoreB,
        lastResult: "wrong",
      }));
    });

    s.on("match:end", (data: MatchEndEvent) => {
      setState(p => ({
        ...p,
        phase: "finished",
        matchEnd: data,
        scoreA: data.scoreA,
        scoreB: data.scoreB,
      }));
    });

    s.on("anticheat:warning", (data: { reason: string }) => {
      setState(p => ({ ...p, anticheatWarning: data.reason }));
      setTimeout(() => setState(pp => ({ ...pp, anticheatWarning: null })), 3000);
    });

    return () => {
      s.off("matchmaking:searching");
      s.off("matchmaking:cancelled");
      s.off("match:found");
      s.off("match:start");
      s.off("round:new");
      s.off("round:answered");
      s.off("round:bot_answer");
      s.off("round:timeout");
      s.off("match:end");
      s.off("anticheat:warning");
    };
  }, []);

  const joinQueue = useCallback((leagueId: string, stake: number) => {
    setState(p => ({ ...p, phase: "searching" }));
    getSocket().emit("matchmaking:join", {
      playerId: params.playerId,
      playerName: params.playerName,
      playerLevel: params.playerLevel,
      playerElo: params.playerElo,
      leagueId,
      stake,
    });
  }, [params]);

  const cancelQueue = useCallback(() => {
    getSocket().emit("matchmaking:cancel");
    setState(p => ({ ...p, phase: "idle" }));
  }, []);

  const sendAnswer = useCallback((colorId: string) => {
    const st = stateRef.current;
    if (!st.roomId || st.phase !== "playing") return;
    const elapsedMs = Date.now() - roundStartRef.current;
    getSocket().emit("round:answer", { roomId: st.roomId, colorId, elapsedMs });
  }, []);

  const forfeit = useCallback(() => {
    const st = stateRef.current;
    if (!st.roomId) return;
    getSocket().emit("match:forfeit", { roomId: st.roomId });
  }, []);

  const reset = useCallback(() => {
    setState({
      phase: "idle",
      roomId: null,
      matchInfo: null,
      currentChallenge: null,
      scoreA: 0, scoreB: 0,
      streakA: 0, streakB: 0,
      roundNumber: 0,
      lastResult: null,
      matchEnd: null,
      countdownSec: 3,
      anticheatWarning: null,
    });
  }, []);

  return { state, joinQueue, cancelQueue, sendAnswer, forfeit, reset };
}
