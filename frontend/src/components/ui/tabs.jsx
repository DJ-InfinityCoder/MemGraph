import React from "react";
import { cn } from "../../lib/utils";

export function TabsList({ className, ...props }) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900/90 p-1 text-zinc-400 border border-zinc-800/80",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, active, children, onClick, ...props }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs md:text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50",
        active
          ? "bg-zinc-950 text-white shadow-sm border border-zinc-800"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

