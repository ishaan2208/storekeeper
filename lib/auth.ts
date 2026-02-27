import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "sk_session";

export const ROLE_VALUES = ["ADMIN", "STORE_MANAGER", "DEPARTMENT_USER", "TECHNICIAN"] as const;
export type Role = (typeof ROLE_VALUES)[number];

export type SessionUser = {
  id: string;
  name: string;
  role: Role;
};

type SessionJwtPayload = {
  sub: string;
  name: string;
  role: Role;
};

function sessionSecretKey(): Uint8Array {
  const secret = process.env.STOREKEEPER_AUTH_SECRET;
  if (!secret) {
    // Treat as unauthenticated if not configured.
    return new Uint8Array();
  }
  return new TextEncoder().encode(secret);
}

function hasSecret(key: Uint8Array): boolean {
  return key.length > 0;
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  const key = sessionSecretKey();
  if (!hasSecret(key)) {
    throw new Error("Missing STOREKEEPER_AUTH_SECRET.");
  }

  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ name: user.name, role: user.role } satisfies Omit<
    SessionJwtPayload,
    "sub"
  >)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60 * 24 * 7) // 7 days
    .setIssuer("storekeeper")
    .setAudience("storekeeper")
    .sign(key);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  const key = sessionSecretKey();
  if (!hasSecret(key)) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: "storekeeper",
      audience: "storekeeper",
    });

    const sub = payload.sub;
    const name = payload.name;
    const role = payload.role;

    if (typeof sub !== "string" || typeof name !== "string" || typeof role !== "string") {
      return null;
    }
    if (sub.trim().length === 0) {
      return null;
    }

    if (!ROLE_VALUES.includes(role as Role)) {
      return null;
    }

    return { id: sub, name, role: role as Role };
  } catch {
    return null;
  }
}

