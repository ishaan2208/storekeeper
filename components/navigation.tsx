"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconMenu2 as Menu,
  IconX as X,
  IconChevronRight as ChevronRight,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { Home, Package, FileText, Wrench, BarChart3, Database } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/masters", label: "Masters", icon: Database },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/slips", label: "Slips", icon: FileText },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="relative">
      {/* Desktop — underline style */}
      <nav className="hidden items-center gap-1 lg:flex">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <motion.div key={item.href} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
              <Link
                href={item.href}
                className={`relative px-3 py-2 text-sm transition-colors ${
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
                <span
                  className={`pointer-events-none absolute right-2 -bottom-0.5 left-2 h-0.5 rounded-full transition-all duration-200 ${
                    active ? "bg-primary" : "bg-transparent"
                  }`}
                />
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Mobile — hamburger toggle */}
      <motion.button
        aria-label="Toggle menu"
        className="hover:bg-muted inline-flex size-9 items-center justify-center rounded-md lg:hidden"
        onClick={() => setOpen((s) => !s)}
        whileTap={{ scale: 0.92 }}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </motion.button>

      {/* Mobile — animated dropdown */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.6 }}
            className="absolute top-full left-0 z-50 mt-2 w-48 rounded-xl border bg-card shadow-lg lg:hidden"
          >
            <nav className="grid gap-1 p-2">
              {navItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.href}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
