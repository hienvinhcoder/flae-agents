import React, { HTMLAttributes } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  glow?: "none" | "primary" | "teal" | "indigo";
  className?: string;
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "pill";
  dense?: boolean;
}

export function GlassCard({
  children,
  interactive = false,
  glow = "none",
  className,
  rounded = "lg",
  dense = false,
  ...props
}: GlassCardProps) {
  const roundedClasses = {
    sm: "rounded-[6px]",
    md: "rounded-[10px]",
    lg: "rounded-[14px]",
    xl: "rounded-[18px]",
    "2xl": "rounded-[24px]",
    pill: "rounded-full",
  }[rounded];

  const glowClasses = {
    none: "",
    primary: "border-[#FF5B26]/30 shadow-[0_0_30px_rgba(249,115,22,0.15)]",
    teal: "border-[#14B8A6]/30 shadow-[0_0_30px_rgba(20,184,166,0.15)]",
    indigo: "border-[#6366F1]/30 shadow-[0_0_30px_rgba(99,102,241,0.15)]",
  }[glow];

  return (
    <div
      className={twMerge(
        "relative overflow-hidden bg-[rgba(255,251,245,0.06)] backdrop-blur-xl border border-[rgba(255,251,245,0.14)]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,251,245,0.08)]",
        roundedClasses,
        dense ? "p-4" : "p-6 sm:p-8",
        interactive &&
          "transition-all duration-200 ease-out hover:bg-[rgba(255,251,245,0.10)] hover:border-[rgba(255,251,245,0.24)] hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.50),inset_0_1px_0_rgba(255,251,245,0.12)] hover:-translate-y-0.5",
        glowClasses,
        className
      )}
      {...props}
    >
      {/* Top light highlight catch */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[rgba(255,251,245,0.25)] to-transparent"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
