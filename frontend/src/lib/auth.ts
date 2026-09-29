import { decodeTokenClaims, type TokenClaims } from "@/lib/session-token";

const TOKEN_KEY = "aives_token";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

export function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${SEVEN_DAYS}; samesite=lax`;
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; samesite=lax`;
  document.cookie = `aives_session=; path=/; max-age=0; samesite=lax`;
}

export function readTokenClaims(token = getAccessToken()): TokenClaims | null {
  if (!token) {
    return null;
  }
  return decodeTokenClaims(token);
}
