import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import "./globals.css";

import { clearSessionCookie, getSession } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Storekeeper",
  description: "Internal inventory movement tracker",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  async function logoutAction() {
    "use server";
    await clearSessionCookie();
    redirect("/login");
  }

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
          <header className="border-b bg-white dark:bg-zinc-900">
            <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                Storekeeper
              </Link>
              <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                <Link href="/" className="rounded px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  Home
                </Link>
                <Link
                  href="/masters"
                  className="rounded px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Masters
                </Link>
                <Link
                  href="/inventory"
                  className="rounded px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Inventory
                </Link>
                <Link
                  href="/slips"
                  className="rounded px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Slips
                </Link>
                <Link
                  href="/maintenance"
                  className="rounded px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Maintenance
                </Link>
                <Link
                  href="/reports"
                  className="rounded px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Reports
                </Link>

                <span className="mx-1 hidden h-5 w-px bg-zinc-200 dark:bg-zinc-800 sm:block" />

                {session ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600 dark:text-zinc-300">
                      {session.name} ({session.role})
                    </span>
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="rounded px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Logout
                      </button>
                    </form>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="rounded bg-zinc-900 px-3 py-2 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                  >
                    Login
                  </Link>
                )}
              </div>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
