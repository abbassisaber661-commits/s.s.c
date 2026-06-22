export type AuthMode = 'google' | 'pi' | 'guest' | null;

export interface AuthUser {
  uid: string;
  username: string;
  email?: string;
  authMode: AuthMode;
  photoURL?: string;
}

const AUTH_KEY = 'sl_auth_user';

export function saveAuthUser(user: AuthUser): void {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } catch {
    // ignore storage errors
  }
}

export function loadAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // basic validation (lightweight without zod)
    if (!parsed?.uid || !parsed?.username || !parsed?.authMode) {
      return null;
    }

    return parsed as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuthUser(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem('pi_user');
}

export function createGoogleUser(name: string, email: string): AuthUser {
  let safeEmail = email || "unknown";

  let uidBase = safeEmail;
  try {
    uidBase = btoa(safeEmail);
  } catch {
    uidBase = safeEmail.replace(/[^a-zA-Z0-9]/g, '');
  }

  const uid =
    'google_' +
    uidBase.replace(/[^a-z0-9]/gi, '').slice(0, 12);

  return {
    uid,
    username: name.trim().slice(0, 20) || "User",
    email,
    authMode: 'google',
  };
}

export function createGuestUser(): AuthUser {
  return {
    uid: 'guest_' + Math.random().toString(36).slice(2, 10),
    username: 'ضيف',
    authMode: 'guest',
  };
}

export function createPiUser(uid: string, username: string): AuthUser {
  return {
    uid,
    username: username?.trim().slice(0, 20) || "Pi User",
    authMode: 'pi',
  };
}

export function isGuestUser(user: AuthUser | null): boolean {
  return user?.authMode === 'guest';
}