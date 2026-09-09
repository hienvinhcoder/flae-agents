import React, { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface ButtonBaseProps {
  variant?: "primary" | "secondary" | "ghost" | "amber";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  glow?: boolean;
}

type ButtonProps = ButtonBaseProps &
  (
    | (ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined })
    | (AnchorHTMLAttributes<HTMLAnchorElement> & { href: string })
  );

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "right",
  glow = true,
  href,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: "px-3.5 py-1.5 text-xs gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5",
  }[size];

  const variantClasses = {
    primary: clsx(
      "bg-[#FF5B26] hover:bg-[#F97316] text-white font-medium",
      "shadow-[0_0_24px_rgba(249,115,22,0.35)] hover:shadow-[0_0_32px_rgba(249,115,22,0.55)]",
      "border border-white/10"
    ),
    secondary: clsx(
      "bg-[rgba(255,251,245,0.06)] hover:bg-[rgba(255,251,245,0.12)] text-[#F5F0E8] hover:text-white font-medium",
      "border border-[rgba(255,251,245,0.14)] hover:border-[rgba(255,251,245,0.28)]",
      "backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
    ),
    amber: clsx(
      "bg-[#F59E0B] hover:bg-[#D97706] text-black font-medium",
      "shadow-[0_0_20px_rgba(245,158,11,0.35)]",
      "border border-white/20"
    ),
    ghost: clsx(
      "bg-transparent hover:bg-[rgba(255,251,245,0.06)] text-[#B7AB9A] hover:text-[#F5F0E8]",
      "border border-transparent"
    ),
  }[variant];

  const combinedClasses = twMerge(
    "inline-flex items-center justify-center rounded-full transition-all duration-200 ease-out active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B26] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141009]",
    sizeClasses,
    variantClasses,
    className
  );

  if (href) {
    return (
      <a href={href} className={combinedClasses} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {icon && iconPosition === "left" && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
        {icon && iconPosition === "right" && <span className="shrink-0">{icon}</span>}
      </a>
    );
  }

  return (
    <button className={combinedClasses} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {icon && iconPosition === "left" && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === "right" && <span className="shrink-0">{icon}</span>}
    </button>
  );
}
