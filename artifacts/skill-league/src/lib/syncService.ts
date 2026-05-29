import { api, isApiAvailable, getStoredPlayerId, setStoredPlayerId, type ApiPlayer } from './apiClient';

const SYNC_KEY   = 'sl_last_sync';
const SYNC_INTERVAL = 60_000;
const OFFLINE_KEY = 'sl_offline_mode';

export function isOfflineMode(): boolean {
  return localStorage.getItem(OFFLINE_KEY) === 'true';
}
export function setOfflineMode(v: boolean) {
  localStorage.setItem(OFFLINE_KEY, v ? 'true' : 'false');
}

export async function checkApiAndSync(
  playerId: string | null,
  localData: Partial<ApiPlayer>,
): Promise<{ synced: boolean; serverData?: Partial<ApiPlayer> }> {
  if (!playerId) return { synced: false };
  try {
    const available = await isApiAvailable();
    if (!available) { setOfflineMode(true); return { synced: false }; }
    setOfflineMode(false);

    const lastSync = Number(localStorage.getItem(SYNC_KEY) ?? 0);
    if (Date.now() - lastSync < SYNC_INTERVAL) return { synced: true };

    await api.players.sync(playerId, localData);
    localStorage.setItem(SYNC_KEY, String(Date.now()));
    return { synced: true };
  } catch {
    setOfflineMode(true);
    return { synced: false };
  }
}

export async function fetchServerProfile(playerId: string): Promise<ApiPlayer | null> {
  try {
    return await api.players.get(playerId);
  } catch {
    return null;
  }
}

export async function registerAndSync(
  username: string, password: string, language = 'en'
): Promise<{ token: string; player: ApiPlayer } | null> {
  try {
    const res = await api.auth.register(username, password, language);
    setStoredPlayerId(res.player.id);
    return res;
  } catch {
    return null;
  }
}

export async function loginAndSync(
  username: string, password: string
): Promise<{ token: string; player: ApiPlayer } | null> {
  try {
    const res = await api.auth.login(username, password);
    setStoredPlayerId(res.player.id);
    return res;
  } catch {
    return null;
  }
}

export async function guestSync(
  guestId: string, username: string
): Promise<{ token: string; player: ApiPlayer } | null> {
  try {
    const res = await api.auth.guest(guestId, username);
    setStoredPlayerId(res.player.id);
    return res;
  } catch {
    return null;
  }
}

export async function piSync(
  piUid: string, username: string, accessToken?: string
): Promise<{ token: string; player: ApiPlayer } | null> {
  try {
    const res = await api.auth.pi(piUid, username, accessToken);
    setStoredPlayerId(res.player.id);
    return res;
  } catch {
    return null;
  }
}

export function scheduleBackgroundSync(
  playerId: string,
  getData: () => Partial<ApiPlayer>,
): () => void {
  const handle = setInterval(async () => {
    if (isOfflineMode()) return;
    const data = getData();
    await checkApiAndSync(playerId, data).catch(() => {});
  }, SYNC_INTERVAL);
  return () => clearInterval(handle);
}
