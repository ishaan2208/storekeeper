"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SparklesProps {
  className?: string;
  children?: React.ReactNode;
  sparkleCount?: number;
}

export const Sparkles = ({ className, children, sparkleCount = 10 }: SparklesProps) => {
  const id = useId();
  const sparkles = Array.from({ length: sparkleCount }, (_, i) => ({
    id: `${id}-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    duration: Math.random() * 2 + 1,
  }));

  return (
    <div className={cn("relative", className)}>
      <div className="relative z-10">{children}</div>
      <div className="absolute inset-0 overflow-hidden">
        {sparkles.map((sparkle) => (
          <motion.div
            key={sparkle.id}
            className="absolute h-1 w-1 rounded-full bg-primary"
            style={{
              left: `${sparkle.x}%`,
              top: `${sparkle.y}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: sparkle.duration,
              repeat: Infinity,
              delay: sparkle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
};
