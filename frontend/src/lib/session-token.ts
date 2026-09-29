export type TokenClaims = {
  sub?: string;
  email?: string;
  role?: "STUDENT" | "EXAMINER" | "ADMIN";
};

export function decodeTokenClaims(token: string): TokenClaims | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as TokenClaims;
  } catch {
    return null;
  }
}
