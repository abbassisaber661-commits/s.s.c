const SUBMIT_KEY  = 'sl_submit_log';
const MAX_SCORE   = 600;
const MAX_SUBMITS_PER_30S = 3;
const MAX_SUBMITS_PER_HOUR = 30;

interface SubmitEntry {
  ts: number;
  score: number;
}

function getLog(): SubmitEntry[] {
  try { return JSON.parse(localStorage.getItem(SUBMIT_KEY) || '[]'); }
  catch { return []; }
}

function saveLog(log: SubmitEntry[]) {
  localStorage.setItem(SUBMIT_KEY, JSON.stringify(log.slice(-100)));
}

export function isScorePlausible(score: number, accuracy: number): boolean {
  if (score < 0 || score > MAX_SCORE)       return false;
  if (accuracy < 0 || accuracy > 100)        return false;
  return true;
}

export function checkRateLimit(): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const log = getLog();
  const per30  = log.filter(e => now - e.ts < 30_000).length;
  const perHour = log.filter(e => now - e.ts < 3_600_000).length;
  if (per30  >= MAX_SUBMITS_PER_30S)   return { allowed: false, reason: 'Slow down — too many submissions' };
  if (perHour >= MAX_SUBMITS_PER_HOUR) return { allowed: false, reason: 'Hourly match limit reached' };
  return { allowed: true };
}

export function recordSubmission(score: number) {
  const log = getLog();
  log.push({ ts: Date.now(), score });
  saveLog(log);
}

export function validateUsername(name: string): { valid: boolean; reason?: string } {
  const trimmed = name.trim();
  if (trimmed.length < 2)  return { valid: false, reason: 'At least 2 characters' };
  if (trimmed.length > 20) return { valid: false, reason: 'Max 20 characters' };
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed))
    return { valid: false, reason: 'Only letters, numbers and underscores' };
  return { valid: true };
}

export function checkPostSpam(
  text: string,
  lastPostTs: number | null,
  hasImage = false,
): { spam: boolean; reason?: string } {
  if (!hasImage && (!text || text.trim().length < 3))
    return { spam: true, reason: 'Write at least 3 characters or add an image.' };
  if (text && text.length > 280)
    return { spam: true, reason: 'Max 280 characters' };
  if (lastPostTs && Date.now() - lastPostTs < 60_000)
    return { spam: true, reason: 'Wait 60 s before posting again' };
  return { spam: false };
}

export function detectAnomalousSession(scores: number[]): boolean {
  if (scores.length < 5) return false;
  const perfect = scores.filter(s => s >= MAX_SCORE * 0.95).length;
  return perfect / scores.length > 0.8;
}
