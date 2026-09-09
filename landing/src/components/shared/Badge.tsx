import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "synced" | "indexing" | "error" | "mcp" | "eyebrow" | "outline" | "orange";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export function Badge({
  children,
  variant = "outline",
  size = "sm",
  dot = false,
  className,
  icon,
}: BadgeProps) {
  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-[11px] gap-1.5",
    md: "px-3 py-1 text-xs gap-2",
  }[size];

  const variantClasses = {
    synced: "bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/30 shadow-[0_0_12px_rgba(20,184,166,0.2)]",
    indexing: "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]",
    error: "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30",
    mcp: "bg-[#6366F1]/10 text-[#818CF8] border border-[#6366F1]/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]",
    orange: "bg-[#FF5B26]/15 text-[#FB923C] border border-[#FF5B26]/30 shadow-[0_0_14px_rgba(249,115,22,0.2)]",
    eyebrow: "bg-[rgba(255,251,245,0.04)] text-[#FB923C] border border-[#FF5B26]/30 font-mono uppercase tracking-[0.08em] shadow-[0_0_16px_rgba(249,115,22,0.15)]",
    outline: "bg-[rgba(255,251,245,0.04)] text-[#B7AB9A] border border-[rgba(255,251,245,0.14)]",
  }[variant];

  const dotColor = {
    synced: "bg-[#14B8A6]",
    indexing: "bg-[#F59E0B] animate-ping",
    error: "bg-[#EF4444]",
    mcp: "bg-[#6366F1]",
    orange: "bg-[#FF5B26]",
    eyebrow: "bg-[#FF5B26]",
    outline: "bg-[#B7AB9A]",
  }[variant];

  return (
    <span
      className={twMerge(
        "inline-flex items-center font-medium rounded-full backdrop-blur-sm select-none",
        sizeClasses,
        variantClasses,
        className
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className={clsx("h-1.5 w-1.5 rounded-full", dotColor)} />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
