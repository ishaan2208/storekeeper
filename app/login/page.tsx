import { Role } from "@prisma/client";
import { timingSafeEqual } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type LoginPageProps = {
  searchParams?: Promise<{ next?: string; error?: string }>;
};

function safeNextPath(input: unknown): string {
  const value = typeof input === "string" ? input : "";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

function messageFromError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unable to sign in.";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const nextPath = safeNextPath(params?.next);

  async function loginAction(formData: FormData) {
    "use server";

    try {
      const phone = String(formData.get("phone") ?? "").trim();
      const accessCode = String(formData.get("accessCode") ?? "").trim();
      const next = safeNextPath(formData.get("next"));

      const expected = process.env.STOREKEEPER_LOGIN_CODE;
      if (!expected) {
        throw new Error("Missing STOREKEEPER_LOGIN_CODE.");
      }

      const a = Buffer.from(accessCode);
      const b = Buffer.from(expected);
      const ok =
        a.length === b.length &&
        // timingSafeEqual throws if lengths differ.
        timingSafeEqual(a, b);

      if (!ok) {
        throw new Error("Invalid access code.");
      }

      const user = await prisma.user.findFirst({
        where: { phone },
        select: { id: true, name: true, role: true },
      });

      if (!user) {
        throw new Error("No user found for that phone number.");
      }

      const token = await signSessionToken({
        id: user.id,
        name: user.name,
        role: user.role as Role,
      });

      const { cookies } = await import("next/headers");
      (await cookies()).set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      redirect(next);
    } catch (error) {
      redirect(`/login?next=${encodeURIComponent(nextPath)}&error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Use your phone number and the shared access code.
        </p>
      </header>

      {params?.error ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-900">
          {params.error}
        </p>
      ) : null}

      <form action={loginAction} className="rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-900">
        <input type="hidden" name="next" value={nextPath} />

        <label className="block text-sm font-medium">Phone</label>
        <input
          name="phone"
          inputMode="numeric"
          autoComplete="tel"
          className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          placeholder="9999999999"
          required
        />

        <label className="mt-4 block text-sm font-medium">Access code</label>
        <input
          name="accessCode"
          type="password"
          autoComplete="one-time-code"
          className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          required
        />

        <button
          type="submit"
          className="mt-5 w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Sign in
        </button>
      </form>

      <p className="text-center text-xs text-zinc-600 dark:text-zinc-300">
        Back to <Link href="/" className="underline">home</Link>.
      </p>
    </main>
  );
}

