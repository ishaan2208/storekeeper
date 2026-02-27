"use client";

import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <main>
      <div
        className={cn(
          "relative flex flex-col h-full w-full items-center justify-center bg-background text-foreground transition-bg",
          className
        )}
        {...props}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={cn(
              `
              [--purple:262_83%_58%]
              [--pink:291_91%_73%]
              [--aurora-gradient:linear-gradient(to_right,hsl(var(--purple)),hsl(var(--pink)),hsl(var(--purple)))]
              [background:linear-gradient(rgba(var(--background)),rgba(var(--background))),var(--aurora-gradient)]
              absolute -inset-[10px] opacity-50 blur-[50px] after:absolute 
              after:-inset-[10px] after:opacity-50 after:blur-[50px] 
              after:[background:var(--aurora-gradient)]
              after:animate-aurora
              `,
              showRadialGradient &&
                `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]`
            )}
          ></div>
        </div>
        {children}
      </div>
    </main>
  );
};
