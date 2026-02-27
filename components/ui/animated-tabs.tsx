"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tab = {
  title: string;
  value: string;
  content?: string | React.ReactNode;
};

export const Tabs = ({
  tabs: propTabs,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName,
  activeTab,
  setActiveTab,
}: {
  tabs: Tab[];
  containerClassName?: string;
  activeTabClassName?: string;
  tabClassName?: string;
  contentClassName?: string;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}) => {
  const [hovering, setHovering] = useState(false);

  return (
    <>
      <div
        className={cn(
          "flex flex-row items-center justify-start relative overflow-auto sm:overflow-visible no-scrollbar",
          containerClassName
        )}
      >
        {propTabs.map((tab, idx) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab?.(tab.value)}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className={cn("relative px-3 py-2 rounded-lg", tabClassName)}
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            {activeTab === tab.value && (
              <motion.div
                layoutId="clickedbutton"
                transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                className={cn(
                  "absolute inset-0 bg-primary/10 rounded-lg",
                  activeTabClassName
                )}
              />
            )}

            <span className="relative block text-sm font-medium">
              {tab.title}
            </span>
          </button>
        ))}
      </div>
    </>
  );
};
