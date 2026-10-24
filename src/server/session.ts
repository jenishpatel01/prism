import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";

/*
 * Sign-in sessions live in one encrypted, HTTP-only cookie (AES-256-GCM via
 * AUTH_SECRET). The GitHub access token inside it never reaches the browser's
 * JavaScript and can't be read without the server secret.
 */

export type Session = {
  githubId: number;
  login: string;
  name: string | null;
  avatar: string;
  token: string;
  scopes: string[];
};

export const SESSION_COOKIE = "prism_session";
export const OAUTH_COOKIE = "prism_oauth";
const MAX_AGE = 60 * 60 * 24 * 180; // stays signed in until the user signs out (or 180 days pass)

function key(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  return new Uint8Array(createHash("sha256").update(secret).digest());
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function sealSession(session: Session) {
  const k = key();
  if (!k) throw new Error("AUTH_SECRET is missing or shorter than 32 characters.");
  const value = await new EncryptJWT({ ...session })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .encrypt(k);
  return { name: SESSION_COOKIE, value, options: { ...cookieOptions, maxAge: MAX_AGE } };
}

/** The signed-in user, or null. Reads cookies, so call it inside a Suspense boundary. */
export async function getSession(): Promise<Session | null> {
  // Read the cookie first, always: this marks the caller as per-request, so a
  // page built before AUTH_SECRET existed is never frozen as "signed out".
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  const k = key();
  if (!raw || !k) return null;
  try {
    const { payload } = await jwtDecrypt(raw, k);
    if (typeof payload.githubId !== "number" || typeof payload.token !== "string") return null;
    return payload as unknown as Session;
  } catch {
    return null; // expired, tampered with, or AUTH_SECRET changed
  }
}

/** What the UI may know about the user. Never includes the token. */
export type PublicUser = { login: string; name: string | null; avatar: string; canPrivate: boolean };

export function publicUser(s: Session): PublicUser {
  return { login: s.login, name: s.name, avatar: s.avatar, canPrivate: s.scopes.includes("repo") };
}
