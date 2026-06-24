const SAVED_KEY = 'sl_saved_posts';

export function getSavedPostIds(): string[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); }
  catch { return []; }
}

export function isSaved(postId: string): boolean {
  return getSavedPostIds().includes(postId);
}

export function toggleSave(postId: string): boolean {
  const ids = getSavedPostIds();
  const already = ids.includes(postId);
  const updated = already ? ids.filter(id => id !== postId) : [...ids, postId];
  localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
  return !already;
}
