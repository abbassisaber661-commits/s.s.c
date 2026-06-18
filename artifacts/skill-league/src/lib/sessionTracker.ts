import { api } from './apiClient';

const SESSION_KEY    = 'sl_session_start';
const PLAYTIME_KEY   = 'sl_total_playtime_ms';
const LAST_PING_KEY  = 'sl_last_ping';
const PING_INTERVAL  = 30_000;

let pingHandle: ReturnType<typeof setInterval> | null = null;
let sessionStart = 0;

export function startSession() {
  sessionStart = Date.now();
  localStorage.setItem(SESSION_KEY, String(sessionStart));
  if (pingHandle) clearInterval(pingHandle);
  pingHandle = setInterval(pingSession, PING_INTERVAL);
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

export function endSession(playerId: string | null) {
  if (!sessionStart) return;
  const duration = Date.now() - sessionStart;
  if (pingHandle) { clearInterval(pingHandle); pingHandle = null; }
  addToTotalPlaytime(duration);
  if (playerId) sendPlaytimeEvent(playerId, duration).catch(() => {});
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  sessionStart = 0;
}

function pingSession() {
  localStorage.setItem(LAST_PING_KEY, String(Date.now()));
}

function handleVisibilityChange() {
  if (document.hidden) {
    const now = Date.now();
    if (sessionStart) {
      const partial = now - sessionStart;
      addToTotalPlaytime(partial);
      sessionStart = now;
    }
  }
}

function addToTotalPlaytime(ms: number) {
  const existing = Number(localStorage.getItem(PLAYTIME_KEY) ?? 0);
  localStorage.setItem(PLAYTIME_KEY, String(existing + ms));
}

export function getTotalPlaytimeMs(): number {
  return Number(localStorage.getItem(PLAYTIME_KEY) ?? 0);
}

export function getTotalPlaytimeFormatted(): string {
  const ms  = getTotalPlaytimeMs();
  const hrs = Math.floor(ms / 3_600_000);
  const min = Math.floor((ms % 3_600_000) / 60_000);
  if (hrs > 0) return `${hrs}h ${min}m`;
  return `${min}m`;
}

async function sendPlaytimeEvent(playerId: string, durationMs: number) {
  await api.analytics.event({
    type: 'session_end',
    playerId,
    duration_ms: durationMs,
    duration_min: Math.round(durationMs / 60_000),
    timestamp: new Date().toISOString(),
  });
}

export function trackEvent(
  playerId: string | null,
  eventType: string,
  data: Record<string, unknown> = {},
) {
  if (!playerId) return;
  api.analytics.event({ type: eventType, playerId, ...data, timestamp: new Date().toISOString() })
    .catch(() => {});
}

export function trackPageView(playerId: string | null, page: string) {
  trackEvent(playerId, 'page_view', { page });
}

export function trackFeatureUse(playerId: string | null, feature: string, meta?: Record<string, unknown>) {
  trackEvent(playerId, 'feature_use', { feature, ...meta });
}
