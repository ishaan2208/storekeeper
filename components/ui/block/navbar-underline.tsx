"use client";

import { useState } from "react";
import {
  IconMenu2 as Menu,
  IconX as X,
  IconChevronRight as ChevronRight,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";

const items = [
  { label: "Overview", href: "#" },
  { label: "Features", href: "#" },
  { label: "Integrations", href: "#" },
  { label: "Customers", href: "#" },
  { label: "Changelog", href: "#" },
];

const tapProps = {
  whileTap: { scale: 0.98 },
  transition: {
    type: "spring" as const,
    stiffness: 500,
    damping: 30,
    mass: 0.6,
  },
};

export default function NavbarUnderline() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("Overview");

  return (
    <header className="bg-card w-full rounded-xl border">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex w-full items-center justify-between gap-3 md:w-auto">
            <span className="font-semibold">Underline</span>
            <motion.button
              aria-label="Toggle menu"
              className="hover:bg-muted inline-flex size-10 items-center justify-center rounded-md border md:hidden"
              onClick={() => setOpen((s) => !s)}
              whileTap={{ scale: 0.92 }}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </motion.button>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {items.map((i) => (
              <motion.a
                key={i.label}
                href={i.href}
                onClick={() => setActive(i.label)}
                className="text-muted-foreground relative px-3 py-2 text-sm hover:text-black dark:hover:text-white"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                {i.label}
                <span
                  className={`pointer-events-none absolute right-2 -bottom-0.5 left-2 h-0.5 rounded-full transition-all ${
                    active === i.label
                      ? "bg-black dark:bg-white"
                      : "bg-transparent"
                  }`}
                />
              </motion.a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {/* Sign up: black/white theme */}
            <motion.button
              {...tapProps}
              className="hidden rounded-full bg-black px-8 py-2 text-sm font-bold text-white shadow-[0px_-2px_0px_0px_rgba(255,255,255,0.4)_inset] md:block dark:bg-white dark:text-black"
            >
              Sign up
            </motion.button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="border-t py-2 md:hidden"
            >
              <nav className="grid gap-1">
                {items.map((i) => (
                  <motion.button
                    key={i.label}
                    onClick={() => {
                      setActive(i.label);
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                      active === i.label ? "bg-muted" : "hover:bg-muted"
                    }`}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>{i.label}</span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </motion.button>
                ))}
                <div className="flex items-center gap-2 px-3 pt-2">
                  <div className="flex-1" />

                  <motion.button
                    {...tapProps}
                    className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white shadow-[0px_-2px_0px_0px_rgba(255,255,255,0.4)_inset] dark:bg-white dark:text-black"
                  >
                    Sign up
                  </motion.button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

