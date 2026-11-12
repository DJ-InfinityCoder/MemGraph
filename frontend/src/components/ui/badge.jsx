import React from "react";
import { cn } from "../../lib/utils";

export function Badge({ className, variant = "default", ...props }) {
  const variants = {
    default:
      "border-transparent bg-white text-black hover:bg-zinc-200",
    secondary:
      "border-zinc-800 bg-zinc-900 text-zinc-300",
    outline:
      "border-zinc-800 text-zinc-300 bg-transparent",
    active:
      "border-zinc-700 bg-zinc-850 text-white font-medium",
    stale:
      "border-zinc-850 bg-zinc-950 text-zinc-500 line-through",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400 select-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
