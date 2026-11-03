// HMAC-SHA256 request signing shared by both directions of the n8n integration.
// Signed string: `${timestamp}.${rawBody}` (rawBody is "" for GET requests).
// Headers: X-LendLoop-Timestamp (Unix seconds) and X-LendLoop-Signature (hex).

export const TIMESTAMP_HEADER = "X-LendLoop-Timestamp";
export const SIGNATURE_HEADER = "X-LendLoop-Signature";
const MAX_SKEW_SECONDS = 300;

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signHeaders(secret: string, rawBody: string): Promise<Record<string, string>> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return {
    [TIMESTAMP_HEADER]: timestamp,
    [SIGNATURE_HEADER]: await hmacHex(secret, `${timestamp}.${rawBody}`),
  };
}

// Rejects missing or malformed headers, stale timestamps (replay protection)
// and signatures that don't match.
export async function verifySignature(
  secret: string,
  headers: Headers,
  rawBody: string,
): Promise<boolean> {
  const timestamp = headers.get(TIMESTAMP_HEADER);
  const signature = headers.get(SIGNATURE_HEADER);
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > MAX_SKEW_SECONDS) return false;
  const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
  return constantTimeEqual(expected, signature.toLowerCase());
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}
