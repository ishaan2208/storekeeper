import { Role } from "@prisma/client";
import { timingSafeEqual } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BackgroundBeams } from "@/components/ui/background-beams";

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

      const expected = "0000";

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
      // `redirect()` in Next.js throws a special internal exception with
      // message "NEXT_REDIRECT". Re-throw that so the framework can handle
      // the redirect instead of treating it as an error to show on the
      // login page.
      if (
        typeof (error as any)?.message === "string" &&
        (error as any).message.startsWith("NEXT_REDIRECT")
      ) {
        throw error;
      }

      redirect(
        `/login?next=${encodeURIComponent(nextPath)}&error=${encodeURIComponent(messageFromError(error))}`,
      );
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden">
      <BackgroundBeams />
      <div className="relative z-10 mx-auto w-full max-w-md space-y-6 px-6 py-12">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Use your phone number and the shared access code.
          </p>
        </div>

        {params?.error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive backdrop-blur-sm">
            {params.error}
          </div>
        )}

        <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-8 shadow-lg">
          <form action={loginAction} className="space-y-6">
            <input type="hidden" name="next" value={nextPath} />

            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="text-sm font-medium leading-none"
              >
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                inputMode="numeric"
                autoComplete="tel"
                className="flex h-10 w-full rounded-md border border-input bg-background/50 backdrop-blur-sm px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                placeholder="9999999999"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="accessCode"
                className="text-sm font-medium leading-none"
              >
                Access code
              </label>
              <input
                id="accessCode"
                name="accessCode"
                type="password"
                autoComplete="one-time-code"
                className="flex h-10 w-full rounded-md border border-input bg-background/50 backdrop-blur-sm px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                placeholder="Enter access code"
                required
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Sign in
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Back to{" "}
          <Link
            href="/"
            className="font-medium underline underline-offset-4 hover:text-primary transition-colors"
          >
            home
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
