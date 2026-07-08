/**
 * Server-side username format validation — mirrors the frontend rules in
 * `skill-league/src/lib/anti-cheat.ts` (`validateUsername`). Keep both in
 * sync if the rules ever change.
 *
 * Rules: letters (any language/script) + digits only, no symbols/spaces,
 * at least one digit required, case-insensitive, length 3-20.
 */
const USERNAME_CHARS_RE = /^[\p{L}\p{N}]+$/u;
const USERNAME_HAS_DIGIT_RE = /\d/u;

export function validateUsernameFormat(name: unknown): { valid: boolean; reason?: string } {
  if (typeof name !== "string") return { valid: false, reason: "username must be a string" };
  const trimmed = name.trim();
  if (trimmed.length < 3) return { valid: false, reason: "At least 3 characters" };
  if (trimmed.length > 20) return { valid: false, reason: "Max 20 characters" };
  if (!USERNAME_CHARS_RE.test(trimmed)) {
    return { valid: false, reason: "Only letters and numbers, no symbols or spaces" };
  }
  if (!USERNAME_HAS_DIGIT_RE.test(trimmed)) {
    return { valid: false, reason: "Must include at least one number" };
  }
  return { valid: true };
}
