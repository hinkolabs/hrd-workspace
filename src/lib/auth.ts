import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "hrd-workspace-secret-key-change-in-production"
);

const COOKIE_NAME = "hrd-session";
const COOKIE_MAX_AGE_DEFAULT = 60 * 60 * 8; // 8 hours
const COOKIE_MAX_AGE_REMEMBER = 60 * 60 * 24 * 30; // 30 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(
  userId: string,
  username: string,
  displayName: string,
  remember: boolean = false
): Promise<string> {
  const maxAge = remember ? COOKIE_MAX_AGE_REMEMBER : COOKIE_MAX_AGE_DEFAULT;
  return new SignJWT({ userId, username, displayName })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${maxAge}s`)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; username: string; displayName: string };
  } catch {
    return null;
  }
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function getSessionCookieOptions(remember: boolean) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: remember ? COOKIE_MAX_AGE_REMEMBER : COOKIE_MAX_AGE_DEFAULT,
  };
}

export const DEFAULT_PASSWORD = "hrdhanaw1!";
