import React from "react";
import { cn } from "../../lib/utils";

export const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-40 select-none";

    const variants = {
      default:
        "bg-white text-black hover:bg-zinc-200 active:scale-[0.98] shadow-sm",
      secondary:
        "bg-zinc-900 text-zinc-100 hover:bg-zinc-850 border border-zinc-800 active:scale-[0.98]",
      outline:
        "border border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900 hover:text-white active:scale-[0.98]",
      ghost:
        "hover:bg-zinc-900 text-zinc-400 hover:text-white",
      destructive:
        "bg-zinc-950 text-zinc-200 border border-zinc-700/80 hover:bg-zinc-900 active:scale-[0.98]",
      link: "text-zinc-300 underline-offset-4 hover:underline",
    };

    const sizes = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-11 rounded-lg px-8 text-base",
      icon: "h-9 w-9 rounded-lg",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
