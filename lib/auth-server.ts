import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, type SessionUser, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSessionOrThrow(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized.");
  }

  // JWT can be valid while the DB has been reset or the user deleted.
  // Ensure we never use a non-existent user id for foreign keys (e.g. AuditEvent.createdById).
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, role: true },
  });

  if (!user) {
    (await cookies()).delete(SESSION_COOKIE_NAME);
    throw new Error("Unauthorized.");
  }

  return { id: user.id, name: user.name, role: user.role };
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}

