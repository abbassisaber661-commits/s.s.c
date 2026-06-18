const STORE_KEY = 'sl_friends_v2';

export type FriendStatus = 'none' | 'pending_sent' | 'friends';

export interface FriendEntry {
  username: string;
  status: FriendStatus;
  at: number;
}

type FriendsStore = Record<string, FriendEntry[]>;

function load(): FriendsStore {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
  catch { return {}; }
}

function save(s: FriendsStore) {
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
}

export function getFriendStatus(me: string, them: string): FriendStatus {
  if (!me || !them || me === them) return 'none';
  const store = load();
  const entry = (store[me] ?? []).find(e => e.username === them);
  return entry?.status ?? 'none';
}

export function sendFriendRequest(me: string, them: string): void {
  acceptFriendRequest(me, them);
}

export function acceptFriendRequest(me: string, them: string): void {
  const store = load();
  store[me] = store[me] ?? [];
  store[them] = store[them] ?? [];
  const myEntry = store[me].find(e => e.username === them);
  if (myEntry) myEntry.status = 'friends';
  else store[me].push({ username: them, status: 'friends', at: Date.now() });
  const theirEntry = store[them].find(e => e.username === me);
  if (theirEntry) theirEntry.status = 'friends';
  else store[them].push({ username: me, status: 'friends', at: Date.now() });
  save(store);
}

export function unfriend(me: string, them: string): void {
  const store = load();
  if (store[me])   store[me]   = store[me].filter(e => e.username !== them);
  if (store[them]) store[them] = store[them].filter(e => e.username !== me);
  save(store);
}

export function getFriendsList(me: string): FriendEntry[] {
  const store = load();
  return (store[me] ?? []).filter(e => e.status === 'friends');
}

export function getFriendsCount(me: string): number {
  return getFriendsList(me).length;
}
