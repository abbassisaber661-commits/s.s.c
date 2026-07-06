/**
 * LeagueDashboard.tsx
 * ───────────────────
 * Full-stack league dashboard — 4 leagues, standings, match schedule,
 * join flow, and match simulation all in one page.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useGame } from '@/contexts/GameContext';
import {
  leagueApi,
  type League, type Season, type SeasonEntry, type SeasonMatch, type LeagueId,
} from '@/lib/league-api';
import { gameLayerApi } from '@/lib/game-layer-api';
import PlayerProgress from '@/components/PlayerProgress';
import ArcadeZone from '@/components/ArcadeZone';
import { X, Trophy, Clock, Users, Zap, CheckCircle, Lock, Star } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

function countdown(endAt: string): string {
  return fmtTime(new Date(endAt).getTime() - Date.now());
}

const RESULT_COLOR: Record<string, string> = {
  win:  'text-emerald-400',
  draw: 'text-yellow-400',
  loss: 'text-red-400',
};

const RESULT_LABEL: Record<string, string> = { win: 'W', draw: 'D', loss: 'L' };

// ── Subscribe Modal ───────────────────────────────────────────────────────────

function SubscribeModal({
  league,
  onConfirm,
  onClose,
  joining,
}: {
  league: League;
  onConfirm: () => void;
  onClose: () => void;
  joining: boolean;
}) {
  const isFree      = (league.entryCostPi ?? 0) === 0;
  const canAfford   = true; // Pi payment handled by Pi SDK

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full max-w-md rounded-t-3xl overflow-hidden"
          style={{ background: '#0d0f1a', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Color top bar */}
          <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${league.color}, ${league.color}60)` }} />

          <div className="px-5 pt-5 pb-8 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: `${league.color}20`, border: `1px solid ${league.color}50` }}
                >
                  {league.icon}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest" style={{ color: `${league.color}99` }}>
                    الانضمام إلى
                  </div>
                  <div className="text-xl font-black text-white">{league.name}</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>

            {/* What you're joining */}
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="text-xs font-black uppercase tracking-widest text-white/40">ماذا ستحصل عليه</div>
              {[
                { icon: <Trophy className="w-4 h-4" />, label: 'موسم تنافسي كامل', sub: '30 مباراة على مدار 30 يوم' },
                { icon: <Users className="w-4 h-4" />, label: 'منافسة حقيقية', sub: `${league.difficulty} — ضد لاعبين حقيقيين` },
                { icon: <Star className="w-4 h-4" />, label: 'فرصة للترقي', sub: 'أفضل 30٪ يرتقون للدوري التالي' },
                { icon: <Zap className="w-4 h-4" />, label: 'مكافآت الموسم', sub: 'عملات + XP + تقدم في الترتيب' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${league.color}20`, color: league.color }}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white">{item.label}</div>
                    <div className="text-xs text-white/40">{item.sub}</div>
                  </div>
                  <CheckCircle className="w-4 h-4 shrink-0" style={{ color: league.color }} />
                </div>
              ))}
            </div>

            {/* Cost */}
            <div
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{
                background: isFree
                  ? 'rgba(52,211,153,0.08)'
                  : canAfford ? `${league.color}12` : 'rgba(239,68,68,0.08)',
                border: `1px solid ${isFree ? 'rgba(52,211,153,0.3)' : canAfford ? league.color + '40' : 'rgba(239,68,68,0.3)'}`,
              }}
            >
              <div>
                <div className="text-xs text-white/40 mb-0.5">تكلفة الدخول</div>
                <div className="text-2xl font-black" style={{ color: isFree ? '#34d399' : '#f59e0b' }}>
                  {isFree ? 'مجاني' : `${league.entryCostPi} π`}
                </div>
                {!isFree && (
                  <div className="text-xs mt-0.5 text-white/40">
                    رسوم دخول Pi — يُدفع عند الاشتراك
                  </div>
                )}
              </div>
              {isFree && <span className="text-2xl">🎉</span>}
              {!isFree && canAfford && <span className="text-2xl">✅</span>}
              {!isFree && !canAfford && <span className="text-2xl">❌</span>}
            </div>

            {/* What happens after */}
            <div className="text-xs text-white/30 text-center leading-relaxed">
              بعد الاشتراك ستُجدوَل لك 30 مباراة تلقائياً. مباراة واحدة تُتاح يومياً.
              <br />يمكنك الانضمام لدوري واحد فقط لكل موسم.
            </div>

            {/* Action */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
              disabled={joining || !canAfford}
              className="w-full h-14 rounded-2xl font-black text-base text-white relative overflow-hidden disabled:opacity-40"
              style={{
                background: `linear-gradient(135deg, ${league.color}, ${league.color}aa)`,
                boxShadow: `0 0 30px ${league.color}40`,
              }}
            >
              {joining ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                    animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                  جاري الاشتراك…
                </span>
              ) : (
                <span>
                  {isFree ? '⚔️ اشترك مجاناً' : canAfford ? `⚔️ اشترك مقابل ${gemCost} 💎` : `❌ رصيد غير كافٍ`}
                </span>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Active League Banner ─────────────────────────────────────────────────────

function ActiveLeagueBanner({
  league,
  entry,
  myRank,
  totalPlayers,
  matchesReady,
  onGoToMatches,
  currentRound,
  totalRounds,
}: {
  league: League;
  entry: SeasonEntry;
  myRank: number | null;
  totalPlayers: number;
  matchesReady: number;
  onGoToMatches: () => void;
  currentRound?: number;
  totalRounds?: number;
}) {
  const promotionZone = myRank !== null && totalPlayers > 0 && myRank <= Math.ceil(totalPlayers * 0.3);
  const relegationZone = myRank !== null && totalPlayers > 0 && myRank > Math.floor(totalPlayers * 0.8);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        border: `1px solid ${league.color}50`,
        background: `linear-gradient(135deg, ${league.color}18, ${league.color}08)`,
        boxShadow: `0 4px 24px ${league.color}20`,
      }}
    >
      {/* Top accent */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${league.color}, transparent)` }} />

      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: `${league.color}20` }}>
            {league.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/40">أنت حالياً في</div>
            <div className="font-black text-base leading-tight" style={{ color: league.color }}>
              {league.name}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-black tabular-nums text-white">
              {myRank !== null ? `#${myRank}` : '—'}
            </div>
            <div className="text-[10px] text-white/40">ترتيبك</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex-1 text-center">
            <div className="text-sm font-black text-emerald-400">{entry.wins}ف</div>
            <div className="text-[10px] text-white/30">انتصار</div>
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex-1 text-center">
            <div className="text-sm font-black text-yellow-400">{entry.draws}ت</div>
            <div className="text-[10px] text-white/30">تعادل</div>
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex-1 text-center">
            <div className="text-sm font-black text-red-400">{entry.losses}خ</div>
            <div className="text-[10px] text-white/30">خسارة</div>
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex-1 text-center">
            <div className="text-sm font-black text-white">{entry.points}</div>
            <div className="text-[10px] text-white/30">نقطة</div>
          </div>
        </div>

        {/* Round / match progress row */}
        {totalRounds != null && (
          <div className="flex items-center justify-between mt-2.5 pt-2.5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">الجولة</span>
              <span className="text-sm font-black" style={{ color: league.color }}>
                {currentRound ?? 1}
              </span>
              <span className="text-[10px] text-white/30">/ {totalRounds}</span>
            </div>
            {(() => {
              const played    = entry.wins + entry.draws + entry.losses;
              const remaining = Math.max(0, totalRounds - played);
              const missed    = Math.max(0, (currentRound ?? 1) - played - 1);
              return (
                <div className="flex gap-3 text-[10px]">
                  <span className="text-indigo-400 font-bold">{played} لُعبت</span>
                  <span className="text-white/40">{remaining} متبقية</span>
                  {missed > 0 && <span className="text-red-400/70">{missed} فائتة</span>}
                </div>
              );
            })()}
          </div>
        )}

        {/* Zone indicator */}
        {myRank !== null && (
          <div className="mt-2.5">
            {promotionZone && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)' }}>
                <span className="text-sm">🚀</span>
                <span className="text-xs font-bold text-emerald-400">منطقة الترقي — استمر للحفاظ على مركزك!</span>
              </div>
            )}
            {!promotionZone && relegationZone && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <span className="text-sm">⚠️</span>
                <span className="text-xs font-bold text-red-400">منطقة الإنحدار — انتبه لترتيبك!</span>
              </div>
            )}
            {!promotionZone && !relegationZone && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-sm">📊</span>
                <span className="text-xs text-white/40">
                  أفضل 30٪ يرتقون · المركز {myRank} من {totalPlayers}
                </span>
              </div>
            )}
          </div>
        )}

        {/* CTA if matches ready */}
        {matchesReady > 0 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onGoToMatches}
            className="w-full mt-3 py-3 rounded-xl font-black text-sm text-white relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${league.color}, ${league.color}aa)`,
              boxShadow: `0 0 20px ${league.color}30`,
            }}
          >
            <motion.div className="absolute inset-y-0 w-1/3 pointer-events-none"
              style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)', left: '-33%' }}
              animate={{ left: ['−33%', '133%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', repeatDelay: 0.6 }}
            />
            <span className="relative">⚔️ {matchesReady} مباراة جاهزة — العب الآن!</span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ── LeagueCard ────────────────────────────────────────────────────────────────

function LeagueCard({
  league, isSelected, hasEntry, season, onClick, isBlocked, activeLeagueName,
}: {
  league: League;
  isSelected: boolean;
  hasEntry: boolean;
  season: Season | null;
  onClick: () => void;
  isBlocked: boolean;
  activeLeagueName?: string;
}) {
  const entryLabel = (league.entryCostPi ?? 0) === 0 ? 'FREE ENTRY' : `${league.entryCostPi} π`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: isBlocked ? 0 : -3 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="relative w-full rounded-3xl overflow-hidden cursor-pointer select-none"
      style={{
        border: `1px solid ${isBlocked ? 'rgba(255,255,255,0.06)' : isSelected ? league.color + '80' : league.color + '30'}`,
        background: isBlocked
          ? 'linear-gradient(140deg, rgba(255,255,255,0.02) 0%, rgba(13,15,26,0.85) 100%)'
          : isSelected
            ? `linear-gradient(140deg, ${league.color}22 0%, ${league.color}08 50%, rgba(13,15,26,0.95) 100%)`
            : 'linear-gradient(140deg, rgba(255,255,255,0.05) 0%, rgba(13,15,26,0.85) 100%)',
        backdropFilter: 'blur(20px)',
        boxShadow: isBlocked
          ? 'none'
          : isSelected
            ? `0 0 0 1px ${league.color}40, 0 12px 60px ${league.color}30, inset 0 1px 0 rgba(255,255,255,0.07)`
            : '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        opacity: isBlocked ? 0.55 : 1,
      }}
    >
      {/* Top shine line */}
      {!isBlocked && (
        <div className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${league.color}70, transparent)` }} />
      )}

      {/* Ambient glow orb */}
      {isSelected && !isBlocked && (
        <motion.div
          className="absolute pointer-events-none rounded-full"
          style={{
            width: 280, height: 280,
            top: -120, right: -80,
            background: `radial-gradient(circle, ${league.color}28 0%, transparent 70%)`,
          }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="relative z-10 px-5 pt-5 pb-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{
                background: isBlocked ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${league.color}35, ${league.color}15)`,
                border: `1px solid ${isBlocked ? 'rgba(255,255,255,0.08)' : league.color + '55'}`,
                boxShadow: isSelected && !isBlocked ? `0 0 24px ${league.color}50` : 'none',
              }}
            >
              {isBlocked ? '🔒' : league.icon}
            </motion.div>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-2xl font-black tracking-tight leading-none"
                  style={{ color: isBlocked ? 'rgba(255,255,255,0.3)' : isSelected ? league.color : 'rgba(255,255,255,0.9)' }}
                >
                  {league.name}
                </span>
              </div>
              <p className="text-xs font-medium"
                style={{ color: isBlocked ? 'rgba(255,255,255,0.2)' : isSelected ? `${league.color}cc` : 'rgba(255,255,255,0.4)' }}>
                {league.difficulty}
              </p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {hasEntry && (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide"
                style={{
                  background: 'rgba(52,211,153,0.15)',
                  border: '1px solid rgba(52,211,153,0.35)',
                  color: '#34d399',
                }}>
                ✓ مشترك
              </span>
            )}
            {isBlocked && !hasEntry && (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.25)',
                }}>
                🔒 محجوب
              </span>
            )}
            {!isBlocked && (gemCost > 0 ? (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide"
                style={{
                  background: canAffordGems ? `${league.color}15` : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${canAffordGems ? league.color + '40' : 'rgba(255,255,255,0.12)'}`,
                  color: canAffordGems ? league.color : 'rgba(255,255,255,0.35)',
                }}>
                {gemCost} 💎
              </span>
            ) : (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide"
                style={{
                  background: 'rgba(52,211,153,0.12)',
                  border: '1px solid rgba(52,211,153,0.3)',
                  color: '#34d399',
                }}>
                {entryLabel}
              </span>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mb-4"
          style={{ background: `linear-gradient(90deg, ${isBlocked ? 'rgba(255,255,255,0.06)' : league.color + '40'}, transparent)` }} />

        {/* Blocked explanation */}
        {isBlocked ? (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Lock className="w-4 h-4 shrink-0 text-white/30" />
            <p className="text-xs text-white/30 leading-relaxed">
              أنت مشترك في <strong className="text-white/50">{activeLeagueName}</strong> هذا الموسم.
              يمكنك الانضمام لدوري واحد فقط لكل موسم.
            </p>
          </div>
        ) : (
          <p className="text-xs leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {league.description}
          </p>
        )}

        {/* Season stats row */}
        {season && !isBlocked && (
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#34d399' }} />
              <span className="text-[10px] text-white/40">الموسم {season.number}</span>
            </div>
            <div className="text-[10px] text-white/40">👥 {season.participantCount} لاعب</div>
            <div className="text-[10px] text-white/40 ml-auto">⏱ {countdown(season.endAt)}</div>
          </div>
        )}

        {/* CTA button */}
        {!isBlocked && (
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="relative w-full h-11 rounded-2xl flex items-center justify-center font-black text-sm overflow-hidden"
            style={isSelected
              ? {
                  background: `linear-gradient(135deg, ${league.color}, ${league.color}aa)`,
                  boxShadow: `0 4px 24px ${league.color}50`,
                  color: '#fff',
                }
              : {
                  background: `${league.color}15`,
                  border: `1px solid ${league.color}40`,
                  color: league.color,
                }
            }
          >
            {isSelected && (
              <motion.div
                className="absolute inset-y-0 w-1/3 pointer-events-none"
                style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)', left: '-33%' }}
                animate={{ left: ['−33%', '133%'] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', repeatDelay: 0.8 }}
              />
            )}
            <span className="relative z-10">
              {hasEntry
                ? '▶ متابعة الموسم'
                : isSelected
                  ? gemCost > 0
                    ? canAffordGems
                      ? `⚔️ اشترك (${gemCost} 💎)`
                      : `❌ تحتاج ${gemCost} 💎`
                    : '⚔️ اشترك مجاناً'
                  : 'عرض الدوري →'}
            </span>
          </motion.div>
        )}
      </div>

      {/* Active selection indicator bar */}
      {isSelected && !isBlocked && (
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl"
          style={{ background: `linear-gradient(180deg, ${league.color}, ${league.color}40)` }} />
      )}
    </motion.div>
  );
}

function StandingsTable({ entries, myPlayerId, promotionCutoff, relegationCutoff }: {
  entries: SeasonEntry[];
  myPlayerId: string;
  promotionCutoff: number;
  relegationCutoff: number;
}) {
  if (entries.length === 0) {
    return (
      <div className="text-center text-white/40 py-8 text-sm">
        لا يوجد لاعبون بعد. كن أول من ينضم!
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-white/40 text-xs border-b border-white/10">
            <th className="text-left pb-2 w-8">#</th>
            <th className="text-left pb-2">اللاعب</th>
            <th className="text-center pb-2 w-8">ف</th>
            <th className="text-center pb-2 w-8">ت</th>
            <th className="text-center pb-2 w-8">خ</th>
            <th className="text-center pb-2 w-10">GD</th>
            <th className="text-right pb-2 w-10">نق</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const isMe   = e.playerId === myPlayerId;
            const rank   = i + 1;
            const inPromo = rank <= promotionCutoff;
            const inRele  = rank > relegationCutoff;
            return (
              <tr
                key={e.id}
                className={`border-b border-white/5 ${isMe ? 'bg-white/5' : ''}`}
              >
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-1">
                    <span className={`font-bold ${
                      i === 0 ? 'text-yellow-400' :
                      i === 1 ? 'text-slate-300' :
                      i === 2 ? 'text-amber-600' : 'text-white/40'
                    }`}>{i + 1}</span>
                    {inPromo && <span className="text-[8px] text-emerald-400" title="منطقة الترقي">▲</span>}
                    {inRele  && <span className="text-[8px] text-red-400"     title="منطقة الإنحدار">▼</span>}
                  </div>
                </td>
                <td className={`py-1.5 truncate max-w-[120px] ${isMe ? 'text-white font-semibold' : 'text-white/80'}`}>
                  {e.playerName}{isMe ? ' (أنت)' : ''}
                </td>
                <td className="py-1.5 text-center text-emerald-400">{e.wins}</td>
                <td className="py-1.5 text-center text-yellow-400">{e.draws}</td>
                <td className="py-1.5 text-center text-red-400">{e.losses}</td>
                <td className="py-1.5 text-center text-white/60">
                  {e.goalsFor - e.goalsAgainst > 0 ? '+' : ''}{e.goalsFor - e.goalsAgainst}
                </td>
                <td className="py-1.5 text-right font-bold text-white">{e.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Zone legend */}
      <div className="flex gap-4 mt-3 pt-3 border-t border-white/5 text-[10px] text-white/30">
        <span className="flex items-center gap-1"><span className="text-emerald-400">▲</span> منطقة الترقي (أفضل 30٪)</span>
        <span className="flex items-center gap-1"><span className="text-red-400">▼</span> منطقة الإنحدار (أسوأ 20٪)</span>
      </div>
    </div>
  );
}

function MatchRow({
  match, onPlay, playing,
}: {
  match: SeasonMatch;
  onPlay: (m: SeasonMatch) => void;
  playing: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-white/5 ${
      match.status === 'played' ? 'opacity-70' : ''
    }`}>
      <div className="w-6 text-center text-white/30 text-xs font-mono">
        {match.matchNumber}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white/80 truncate">ضد {match.opponentName}</div>
        <div className="text-xs text-white/40">اليوم {match.scheduledDay}</div>
      </div>
      {match.status === 'played' && match.result ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">
            {match.playerScore}–{match.opponentScore}
          </span>
          <span className={`font-bold text-sm ${RESULT_COLOR[match.result]}`}>
            {RESULT_LABEL[match.result]}
          </span>
          <span className="text-xs text-white/40">+{match.pointsEarned}نق</span>
        </div>
      ) : match.status === 'available' ? (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPlay(match)}
          disabled={playing}
          className="px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold disabled:opacity-50 transition-colors"
        >
          {playing ? '…' : 'العب'}
        </motion.button>
      ) : match.status === 'missed' ? (
        <span className="text-xs text-red-400/60">فائت</span>
      ) : (
        <span className="text-xs text-white/30">اليوم {match.scheduledDay}</span>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function LeagueDashboard() {
  const [, nav] = useLocation();
  const gameState = useGame();

  const playerId   = (gameState as { id?: string }).id ?? localStorage.getItem('sl_player_id') ?? 'guest';
  const playerName = gameState.username ?? 'Player';

  const [leagues,     setLeagues]     = useState<League[]>([]);
  const [seasons,     setSeasons]     = useState<Record<LeagueId, Season | null>>({} as Record<LeagueId, Season | null>);
  const [standings,   setStandings]   = useState<SeasonEntry[]>([]);
  const [myMatches,   setMyMatches]   = useState<SeasonMatch[]>([]);
  const [myEntries,   setMyEntries]   = useState<Record<LeagueId, SeasonEntry | null>>({} as Record<LeagueId, SeasonEntry | null>);
  const [selected,    setSelected]    = useState<LeagueId>('coins');
  const [tab,         setTab]         = useState<'standings' | 'matches' | 'prizes'>('standings');
  const [pageTab,     setPageTab]     = useState<'league' | 'arcade' | 'progress'>('league');
  const [loading,     setLoading]     = useState(true);
  const [joining,     setJoining]     = useState(false);
  const [playingId,   setPlayingId]   = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [toast,       setToast]       = useState<string | null>(null);
  const [prizeData,   setPrizeData]   = useState<{ amount: number; rank: number; pct: number }[]>([]);
  const [progressKey, setProgressKey] = useState(0);
  const [dailyDone,   setDailyDone]   = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setError(null);
    try {
      const ls = await leagueApi.getLeagues();
      setLeagues(ls);

      const [seasonEntries, entryEntries] = await Promise.all([
        Promise.all(
          ls.map(async l => [l.id, await leagueApi.getSeason(l.id as LeagueId).catch(() => null)] as const),
        ),
        Promise.all(
          ls.map(async l => [l.id, await leagueApi.getPlayerEntry(playerId, l.id as LeagueId).catch(() => null)] as const),
        ),
      ]);
      setSeasons(Object.fromEntries(seasonEntries) as Record<LeagueId, Season | null>);
      setMyEntries(Object.fromEntries(entryEntries) as Record<LeagueId, SeasonEntry | null>);
    } catch (e) {
      setError('تعذر الوصول للخادم. تأكد من تشغيل خادم API.');
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => { load(); }, [load]);

  const loadLeagueData = useCallback(async (lid: LeagueId) => {
    try {
      const st = await leagueApi.getStandings(lid);
      setStandings(st);

      if (seasons[lid]) {
        const ms = await leagueApi.getPlayerMatches(playerId, seasons[lid]!.id);
        setMyMatches(ms);
      }

      if (tab === 'prizes' && seasons[lid]) {
        const p = await leagueApi.getPrizePool(lid);
        setPrizeData(p.breakdown);
      }
    } catch { /* silent */ }
  }, [seasons, playerId, tab]);

  useEffect(() => {
    if (!loading) loadLeagueData(selected);
  }, [selected, loading, loadLeagueData]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleJoin() {
    setShowSubscribeModal(false);
    setJoining(true);
    setError(null);
    try {
      const result = await leagueApi.joinLeague(selected, playerId, playerName);
      const league = leagues.find(l => l.id === selected);
      setMyEntries(prev => ({ ...prev, [selected]: result.entry }));
      setMyMatches(result.matches);
      setSeasons(prev => ({
        ...prev,
        [selected]: prev[selected]
          ? { ...prev[selected]!, participantCount: prev[selected]!.participantCount + 1 }
          : prev[selected],
      }));
      await loadLeagueData(selected);
      showToast(`✅ اشتركت في ${league?.name}! 30 مباراة مجدولة.`);
      setTab('matches');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Join failed';
      if (msg === 'already joined') {
        setError('أنت مشترك بالفعل في هذا الدوري.');
      } else if (msg === 'already_in_league') {
        const otherLeague = leagues.find(l => l.id !== selected && !!myEntries[l.id]);
        setError(`أنت تنافس بالفعل في ${otherLeague?.name ?? 'دوري آخر'} هذا الموسم. دوري واحد لكل موسم.`);
      } else if (msg === 'insufficient_gems') {
        const league = leagues.find(l => l.id === selected);
        setError(`رسوم الدخول: ${league?.entryCostPi ?? 0} π للاشتراك في ${league?.name}.`);
      } else {
        setError(msg);
      }
    } finally {
      setJoining(false);
    }
  }

  async function handlePlay(match: SeasonMatch) {
    setPlayingId(match.id);
    try {
      const result = await leagueApi.playMatch(match.id, playerId, playerName);
      setMyMatches(prev => prev.map(m => m.id === (result as SeasonMatch & { progression?: unknown }).id ? (result as SeasonMatch) : m));
      const r = result as SeasonMatch & { progression?: { xpGained: number; bonusXp: number; newStreak: number; levelledUp: boolean } };
      const label = r.result === 'win' ? '🏆 فزت' : r.result === 'draw' ? '🤝 تعادل' : '😔 خسرت';
      const xpPart = r.progression ? ` · +${r.progression.xpGained + r.progression.bonusXp} XP${r.progression.levelledUp ? ' 🎉 ارتقيت مستوى!' : ''}${r.progression.newStreak >= 3 ? ` 🔥${r.progression.newStreak}` : ''}` : '';
      showToast(`${label} ${r.playerScore}–${r.opponentScore}${xpPart}`);
      setProgressKey(k => k + 1);
      const st = await leagueApi.getStandings(selected);
      setStandings(st);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Play failed';
      setError(msg);
    } finally {
      setPlayingId(null);
    }
  }

  async function handleDailyReward() {
    try {
      await gameLayerApi.claimDaily(playerId, playerName);
      setDailyDone(true);
      setProgressKey(k => k + 1);
      showToast('📅 مكافأة يومية! +20 عملة +10 XP');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Claim failed';
      if (msg.includes('already claimed')) {
        setDailyDone(true);
        showToast('تم الاستلام اليوم — عد غداً!');
      } else {
        showToast(msg);
      }
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const selectedLeague  = leagues.find(l => l.id === selected);
  const activeSeason    = seasons[selected] ?? null;
  const hasEntry        = !!myEntries[selected];
  const availableCount  = myMatches.filter(
    m => m.seasonId === activeSeason?.id && m.status === 'available',
  ).length;
  const seasonMatches   = myMatches.filter(m => m.seasonId === activeSeason?.id);
  const myEntry         = myEntries[selected];

  const activeLeagueId  = (Object.keys(myEntries) as LeagueId[]).find(lid => !!myEntries[lid]) ?? null;
  const activeLeague    = activeLeagueId ? leagues.find(l => l.id === activeLeagueId) : null;
  const isBlockedFromSelected = !!activeLeagueId && activeLeagueId !== selected && !hasEntry;

  const myRank = myEntry && standings.length > 0
    ? standings.findIndex(e => e.playerId === playerId) + 1
    : null;

  // Promotion/relegation cutoffs
  const promotionCutoff = standings.length > 0 ? Math.ceil(standings.length * 0.3) : 0;
  const relegationCutoff = standings.length > 0 ? Math.floor(standings.length * 0.8) : standings.length;

  // Global active entry for banner
  const activeEntry = activeLeagueId ? myEntries[activeLeagueId] : null;
  const activeEntryStandings = activeLeagueId && activeLeagueId === selected ? standings : [];
  const activeEntryRank = activeEntry && activeEntryStandings.length > 0
    ? activeEntryStandings.findIndex(e => e.playerId === playerId) + 1
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0f1a] flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-white/40 text-lg"
        >
          جاري تحميل الدوريات…
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0f1a] text-white pb-24">
      {/* Subscribe Modal */}
      {showSubscribeModal && selectedLeague && (
        <SubscribeModal
          league={selectedLeague}
          onConfirm={handleJoin}
          onClose={() => setShowSubscribeModal(false)}
          joining={joining}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0d0f1a]/90 backdrop-blur border-b border-white/5 px-4 pt-safe-top">
        <div className="max-w-2xl mx-auto flex items-center gap-3 py-3">
          <button onClick={() => window.history.back()} className="text-white/50 hover:text-white transition-colors">
            ← رجوع
          </button>
          <div className="flex-1 text-center">
            <h1 className="font-bold text-lg">لوحة الدوريات</h1>
            <div className="text-xs text-white/40">المنافسة الموسمية</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-yellow-400">{(gameState.dnBalance ?? 0).toLocaleString()} DN$</span>
            </div>
            {availableCount > 0 && (
              <span className="text-xs px-2 py-0.5 bg-indigo-500 rounded-full font-bold">
                {availableCount} جاهزة
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Page-level tabs */}
      <div className="max-w-2xl mx-auto px-4 pt-3">
        <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/10">
          {([
            { id: 'league',   label: '🏆 الدوريات' },
            { id: 'arcade',   label: '🎮 أركيد' },
            { id: 'progress', label: '📈 تقدمي' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setPageTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                pageTab === t.id
                  ? 'bg-indigo-500 text-white shadow-lg'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm px-4 py-3 flex items-center gap-2"
          >
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur border border-white/20 rounded-2xl px-5 py-3 text-sm font-medium text-white shadow-xl"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ARCADE TAB ─────────────────────────────────────────────────────── */}
        {pageTab === 'arcade' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="font-bold text-white mb-1">🎮 منطقة الأركيد</div>
              <div className="text-xs text-white/40 mb-4">
                العب ألعاباً صغيرة لكسب XP وعملات — بدون تأثير على الترتيب.
              </div>
              <ArcadeZone
                playerId={playerId}
                playerName={playerName}
                onProgressUpdate={() => setProgressKey(k => k + 1)}
              />
            </div>
            <PlayerProgress key={`arc-${progressKey}`} playerId={playerId} playerName={playerName} compact />
          </div>
        )}

        {/* ── PROGRESS TAB ───────────────────────────────────────────────────── */}
        {pageTab === 'progress' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-white text-sm">📅 المكافأة اليومية</div>
                <div className="text-xs text-white/40 mt-0.5">+20 عملة · +10 XP · مرة يومياً</div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDailyReward}
                disabled={dailyDone}
                className="px-4 py-2 rounded-xl font-bold text-sm text-white disabled:opacity-40 transition-all"
                style={{ background: dailyDone ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
              >
                {dailyDone ? '✓ تم الاستلام' : 'استلم'}
              </motion.button>
            </div>

            <PlayerProgress key={`prog-${progressKey}`} playerId={playerId} playerName={playerName} />

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-xs text-white/40 space-y-1.5">
              <div className="text-white/60 font-medium text-sm mb-2">كيف يعمل XP</div>
              <div className="flex justify-between"><span>🏆 فوز في مباراة</span><span className="text-indigo-300 font-bold">+70 XP</span></div>
              <div className="flex justify-between"><span>🤝 تعادل في مباراة</span><span className="text-indigo-300 font-bold">+40 XP</span></div>
              <div className="flex justify-between"><span>😔 خسارة في مباراة</span><span className="text-indigo-300 font-bold">+30 XP</span></div>
              <div className="flex justify-between"><span>🔥 سلسلة 3 انتصارات</span><span className="text-orange-400 font-bold">+20 XP</span></div>
              <div className="flex justify-between"><span>🔥 سلسلة 5 انتصارات</span><span className="text-orange-400 font-bold">+50 XP</span></div>
              <div className="flex justify-between"><span>⚡ سلسلة 10 انتصارات</span><span className="text-red-400 font-bold">+100 XP</span></div>
              <div className="flex justify-between"><span>🎮 ألعاب الأركيد</span><span className="text-indigo-300 font-bold">+10–15 XP</span></div>
              <div className="flex justify-between"><span>📅 مكافأة يومية</span><span className="text-yellow-400 font-bold">+10 XP</span></div>
              <div className="mt-2 border-t border-white/10 pt-2 flex justify-between">
                <span>ارتقاء مستوى كل</span><span className="text-white font-bold">500 XP</span>
              </div>
            </div>
          </div>
        )}

        {/* ── LEAGUE TAB ─────────────────────────────────────────────────────── */}
        {pageTab === 'league' && <>

          {/* Active League Banner — shown when player has an active subscription */}
          {activeLeagueId && activeLeague && activeEntry && (
            <ActiveLeagueBanner
              league={activeLeague}
              entry={activeEntry}
              myRank={activeLeagueId === selected ? activeEntryRank : null}
              totalPlayers={activeLeagueId === selected ? standings.length : (seasons[activeLeagueId]?.participantCount ?? 0)}
              matchesReady={myMatches.filter(m => m.status === 'available').length}
              currentRound={seasons[activeLeagueId]?.currentRound}
              totalRounds={seasons[activeLeagueId]?.totalRounds ?? 30}
              onGoToMatches={() => {
                setSelected(activeLeagueId);
                setTab('matches');
              }}
            />
          )}

          {/* League cards */}
          <div className="flex flex-col gap-4">
            {leagues.map((l, idx) => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <LeagueCard
                  league={l}
                  isSelected={l.id === selected}
                  hasEntry={!!myEntries[l.id]}
                  season={seasons[l.id] ?? null}
                  onClick={() => setSelected(l.id as LeagueId)}
                  isBlocked={!!activeLeagueId && activeLeagueId !== l.id && !myEntries[l.id]}
                  activeLeagueName={activeLeague?.name}
                />
              </motion.div>
            ))}
          </div>

          {/* Selected league panel */}
          {selectedLeague && (
            <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              {/* League header */}
              <div
                className="px-4 py-3 flex items-center gap-3"
                style={{ borderLeft: `4px solid ${selectedLeague.color}` }}
              >
                <span className="text-2xl">{selectedLeague.icon}</span>
                <div className="flex-1">
                  <div className="font-bold">{selectedLeague.name}</div>
                  {activeSeason && (
                    <div className="text-xs text-white/40">
                      الموسم {activeSeason.number} · الجولة {activeSeason.currentRound ?? 1}/{activeSeason.totalRounds ?? 30}
                      · {activeSeason.participantCount} لاعب · ينتهي خلال {countdown(activeSeason.endAt)}
                    </div>
                  )}
                </div>

                {myEntry && (
                  <div className="text-right text-xs">
                    <div className="text-white font-bold text-base">{myEntry.points} نق</div>
                    <div className="text-white/40">المركز #{myRank ?? '—'}</div>
                  </div>
                )}
              </div>

              {/* Join / Subscribe strip */}
              {!hasEntry && !isBlockedFromSelected && (
                <div className="px-4 py-3 bg-white/3 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white/60">
                      {(selectedLeague.entryCostPi ?? 0) > 0 ? (
                        <>
                          رسوم الدخول:{' '}
                          <span className="font-bold text-yellow-300">
                            {selectedLeague.entryCostPi} π
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-400 font-semibold">مجاني</span>
                          {' · '}<span className="text-white/40">30 مباراة خلال 30 يوم</span>
                        </>
                      )}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setShowSubscribeModal(true)}
                      className="px-4 py-2 rounded-xl font-bold text-sm text-white transition-colors"
                      style={{ backgroundColor: selectedLeague.color + 'cc' }}
                    >
                      {(selectedLeague.entryCostPi ?? 0) > 0
                        ? `اشترك (${selectedLeague.entryCostPi} π)`
                        : 'اشترك مجاناً'}
                    </motion.button>
                  </div>
                </div>
              )}

              {/* My match summary */}
              {hasEntry && seasonMatches.length > 0 && (
                <div className="px-4 py-2 bg-white/3 border-t border-white/5 flex gap-4 text-xs">
                  <span className="text-emerald-400 font-bold">
                    {seasonMatches.filter(m => m.result === 'win').length}ف
                  </span>
                  <span className="text-yellow-400 font-bold">
                    {seasonMatches.filter(m => m.result === 'draw').length}ت
                  </span>
                  <span className="text-red-400 font-bold">
                    {seasonMatches.filter(m => m.result === 'loss').length}خ
                  </span>
                  <span className="text-white/40">
                    {seasonMatches.filter(m => m.status === 'played').length}/{activeSeason?.totalRounds ?? 30} لُعبت
                  </span>
                  {availableCount > 0 && (
                    <span className="text-indigo-400 font-bold ml-auto">
                      {availableCount} {availableCount === 1 ? 'مباراة جاهزة' : 'مباريات جاهزة'}!
                    </span>
                  )}
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-t border-white/10">
                {(['standings', 'matches', 'prizes'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                      tab === t ? 'text-white border-b-2 border-indigo-400' : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {t === 'standings' ? 'الترتيب' : t === 'matches' ? 'المباريات' : 'الجوائز'}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="px-4 py-3">
                {tab === 'standings' && (
                  <StandingsTable
                    entries={standings}
                    myPlayerId={playerId}
                    promotionCutoff={promotionCutoff}
                    relegationCutoff={relegationCutoff}
                  />
                )}

                {tab === 'matches' && (
                  <>
                    {!hasEntry ? (
                      <div className="text-center text-white/40 py-6 text-sm">
                        انضم للدوري لرؤية جدول مبارياتك.
                      </div>
                    ) : seasonMatches.length === 0 ? (
                      <div className="text-center text-white/40 py-6 text-sm">
                        لا توجد مباريات. جرب التحديث.
                      </div>
                    ) : (
                      seasonMatches.map(m => (
                        <MatchRow
                          key={m.id}
                          match={m}
                          onPlay={handlePlay}
                          playing={playingId === m.id}
                        />
                      ))
                    )}
                  </>
                )}

                {tab === 'prizes' && (
                  <>
                    {(selectedLeague.entryCostPi ?? 0) === 0 ? (
                      <div className="text-center text-white/40 py-6 text-sm">
                        دوري التدريب مجاني — لا يوجد جائزة Pi.
                        <br />أفضل اللاعبين يكسبون ترقياً للدوري التالي!
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between text-xs text-white/40 mb-3">
                          <span>مجموع الجوائز</span>
                          <span className="font-bold text-white">
                            {activeSeason?.prizePool.toFixed(2)} π Pi
                          </span>
                        </div>
                        {prizeData.length === 0 ? (
                          <div className="text-white/30 text-xs text-center py-4">
                            لا توجد بيانات جوائز بعد.
                          </div>
                        ) : (
                          prizeData.map(row => (
                            <div key={row.rank} className={`flex items-center gap-3 py-1.5 text-sm ${
                              row.rank <= 3 ? 'text-white' : 'text-white/60'
                            }`}>
                              <span className="w-6 text-center font-bold">
                                {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
                              </span>
                              <span className="flex-1">{row.pct}% من المجموع</span>
                              <span className="font-bold">{row.amount.toFixed(4)} π</span>
                            </div>
                          ))
                        )}
                        <div className="mt-3 text-xs text-white/30 text-center">
                          الجائزة تنمو مع عدد اللاعبين · أفضل 30٪ يرتقون كل موسم
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Season info */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-xs text-white/40 space-y-1">
            <div className="text-white/60 font-medium text-sm mb-2">كيف تعمل المواسم</div>
            <div>• كل موسم <strong className="text-white/70">30 يوماً</strong> مع <strong className="text-white/70">30 مباراة</strong> — مباراة واحدة يومياً</div>
            <div>• النقاط: <strong className="text-emerald-400">فوز = 3نق</strong> · <strong className="text-yellow-400">تعادل = 1نق</strong> · <strong className="text-red-400">خسارة = 0نق</strong></div>
            <div>• كل جولة تبدأ في منتصف الليل — الجولة الجديدة تُتيح مباراتك التالية</div>
            <div>• أفضل <strong className="text-white/70">30٪</strong> من اللاعبين يرتقون للدوري التالي</div>
            <div>• دوريات Pi تدفع جوائز لأفضل <strong className="text-white/70">10</strong> (من 25٪ إلى 3٪)</div>
          </div>

        </>}
      </div>
    </div>
  );
}

const MATCHES_PER_SEASON = 30;
