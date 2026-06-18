import { z } from "zod";

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
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function loadAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuthUser(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem('pi_user');
}

export function createGoogleUser(name: string, email: string): AuthUser {
  const uid = 'google_' + btoa(email).replace(/[^a-z0-9]/gi, '').slice(0, 12);
  return { uid, username: name.trim().slice(0, 20), email, authMode: 'google' };
}

export function createGuestUser(): AuthUser {
  const uid = 'guest_' + Math.random().toString(36).slice(2, 10);
  return { uid, username: 'ضيف', authMode: 'guest' };
}

export function createPiUser(uid: string, username: string): AuthUser {
  return { uid, username, authMode: 'pi' };
}

export function isGuestUser(user: AuthUser | null): boolean {
  return user?.authMode === 'guest';
}
