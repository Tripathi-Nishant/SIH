import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const SEP = ".";

function getSecret(): string {
  return (
    process.env.OAUTH_STATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "dev-only-oauth-state-secret-change-in-production"
  );
}

/** Signed OAuth state: userId + nonce + HMAC (CSRF protection for GitHub callback). */
export function createOAuthState(userId: string): string {
  const nonce = randomBytes(16).toString("hex");
  const payload = `${userId}${SEP}${nonce}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}${SEP}${sig}`).toString("base64url");
}

export function verifyOAuthState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parts = decoded.split(SEP);
    if (parts.length !== 3) return null;

    const [userId, nonce, sig] = parts;
    const payload = `${userId}${SEP}${nonce}`;
    const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");

    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    return userId;
  } catch {
    return null;
  }
}
