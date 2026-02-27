import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Package, LogOut, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { getSession } from "@/lib/auth-server";
import { logoutAction } from "@/lib/auth-actions";
import { AuroraBackground } from "@/components/ui/aurora-background";

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

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <AuroraBackground>
          <div className="relative min-h-screen w-full flex justify-start space-y-2 flex-col items-center">
            <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/60 min-w-full">
              <div className="container flex h-16 items-center justify-between gap-4 px-4 sm:px-6 min-w-full">
                <div className="flex items-center gap-4">
                  <Link
                    href="/"
                    className="flex items-center gap-2 text-lg font-semibold tracking-tight"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Package className="h-4 w-4" />
                    </div>
                    <span className="hidden sm:inline">Storekeeper</span>
                  </Link>
                  <Navigation />

                </div>

                <div className="flex items-center gap-2">
                  {session ? (
                    <>
                      <div className="hidden items-center gap-3 text-sm lg:flex">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>
                            {session.name}
                            <span className="ml-1 text-xs">({session.role})</span>
                          </span>
                        </div>
                      </div>
                      <form action={logoutAction}>
                        <Button variant="ghost" size="sm">
                          <LogOut className="mr-2 h-4 w-4" />
                          Logout
                        </Button>
                      </form>
                    </>
                  ) : (
                    <Button asChild>
                      <Link href="/login">
                        <User className="mr-2 h-4 w-4" />
                        Login
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </header>

            <main className="container py-6 px-4 sm:px-6">
              {children}
            </main>
          </div>
        </AuroraBackground>
      </body>
    </html>
  );
}
