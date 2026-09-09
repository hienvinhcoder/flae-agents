"use client";

import React from "react";
import { useI18n } from "../../i18n/I18nContext";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className={`inline-flex items-center p-1 rounded-full bg-[rgba(255,251,245,0.06)] border border-[rgba(255,251,245,0.14)] backdrop-blur-md shadow-sm ${className}`}
      role="group"
      aria-label="Language selector"
    >
      <div className="pl-1.5 pr-1 text-[#B7AB9A] flex items-center">
        <Globe className="w-3.5 h-3.5" />
      </div>

      <button
        onClick={() => setLocale("en")}
        className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium transition-all duration-200 cursor-pointer ${
          locale === "en"
            ? "bg-[#FF5B26] text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]"
            : "text-[#B7AB9A] hover:text-[#F5F0E8] hover:bg-white/5"
        }`}
        aria-pressed={locale === "en"}
        title="Switch to English"
      >
        EN
      </button>

      <button
        onClick={() => setLocale("vi")}
        className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium transition-all duration-200 cursor-pointer ${
          locale === "vi"
            ? "bg-[#FF5B26] text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]"
            : "text-[#B7AB9A] hover:text-[#F5F0E8] hover:bg-white/5"
        }`}
        aria-pressed={locale === "vi"}
        title="Chuyển sang Tiếng Việt"
      >
        VI
      </button>
    </div>
  );
}
