"use client";

import React, { useState, useEffect } from "react";
import { FlaeLogoIcon } from "../icons/BrandIcons";
import { Button } from "../shared/Button";
import { LanguageSwitcher } from "../shared/LanguageSwitcher";
import { useI18n } from "../../i18n/I18nContext";
import { Menu, X, ArrowRight, Sparkles } from "lucide-react";

export function FloatingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: t.nav.product, href: "#why-flae" },
    { label: t.nav.useCases, href: "#use-cases" },
    { label: t.nav.integrations, href: "#integrations" },
    { label: t.nav.forAgents, href: "#ai-agents" },
    { label: t.nav.security, href: "#security" },
    { label: t.nav.pricing, href: "#pricing" },
  ];

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="relative z-50 w-full bg-[rgba(20,15,11,0.92)] border-b border-[rgba(255,251,245,0.06)] py-2 px-4 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs text-[#EAE3D6]">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FF5B26]/15 text-[#FB923C] font-mono text-[10px] uppercase font-semibold">
            <Sparkles className="w-3 h-3 text-[#FF5B26]" /> {t.announcement.tag}
          </span>
          <span className="hidden sm:inline text-[#B7AB9A]">{t.announcement.message}</span>
          <span className="sm:hidden text-[#B7AB9A]">{t.announcement.messageMobile}</span>
          <a
            href="#ai-agents"
            className="text-[#FB923C] hover:text-white font-medium inline-flex items-center gap-1 transition-colors ml-1"
          >
            {t.announcement.action} <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Floating Header Wrapper */}
      <header className="sticky top-3 sm:top-4 z-40 w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto transition-all duration-300">
        <nav
          className={`flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 rounded-full border transition-all duration-300 ${
            isScrolled
              ? "bg-[rgba(20,15,11,0.9)] backdrop-blur-xl border-[rgba(255,251,245,0.12)] shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
              : "bg-[rgba(20,15,11,0.7)] backdrop-blur-md border-[rgba(255,251,245,0.08)] shadow-[0_6px_24px_rgba(0,0,0,0.25)]"
          }`}
          aria-label="Main Navigation"
        >
          {/* Logo & Brand */}
          <a
            href="#"
            className="flex items-center gap-2.5 text-[#F5F0E8] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B26] rounded-full px-1"
          >
            <div className="relative flex items-center justify-center">
              <FlaeLogoIcon className="w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 group-hover:scale-105" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-semibold tracking-tight text-lg leading-tight text-[#F5F0E8]">
                FLAE
              </span>
              <span className="text-[9px] tracking-wider font-mono text-[#B7AB9A] uppercase hidden sm:block">
                Company Memory
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1 px-3 py-1 rounded-full bg-[rgba(255,251,245,0.02)] border border-[rgba(255,251,245,0.05)]">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#B7AB9A] hover:text-[#F5F0E8] hover:bg-[rgba(255,251,245,0.05)] transition-all duration-150"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Action CTAs & Language Switcher */}
          <div className="hidden sm:flex items-center gap-2.5">
            <LanguageSwitcher />

            <Button
              href="https://app.flae.ai/login"
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              {t.nav.signIn}
            </Button>
            <Button
              href="https://app.flae.ai/register"
              variant="primary"
              size="sm"
              className="text-xs shadow-[0_0_18px_rgba(249,115,22,0.35)]"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              {t.nav.startBuildingMemory}
            </Button>
          </div>

          {/* Mobile Menu Trigger & Language */}
          <div className="flex items-center gap-2 sm:hidden">
            <LanguageSwitcher />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full text-[#B7AB9A] hover:text-white bg-[rgba(255,251,245,0.05)] border border-[rgba(255,251,245,0.1)] min-h-10 min-w-10 flex items-center justify-center active:scale-95"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#140F0B]/95 backdrop-blur-2xl flex flex-col justify-between p-6 sm:hidden transition-all duration-300 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between pb-6 border-b border-[rgba(255,251,245,0.08)]">
            <div className="flex items-center gap-2.5">
              <FlaeLogoIcon className="w-7 h-7" />
              <span className="font-display font-semibold text-lg text-[#F5F0E8]">FLAE</span>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-full text-[#B7AB9A] hover:text-white bg-[rgba(255,251,245,0.06)] border border-[rgba(255,251,245,0.1)] min-h-10 min-w-10 flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 py-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-[#EAE3D6] hover:text-[#FB923C] py-2 px-3 rounded-lg hover:bg-[rgba(255,251,245,0.04)] transition-colors flex items-center justify-between"
              >
                <span>{link.label}</span>
                <ArrowRight className="w-4 h-4 text-[#6E6457]" />
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-6 border-t border-[rgba(255,251,245,0.08)]">
            <Button
              href="https://app.flae.ai/login"
              variant="secondary"
              size="lg"
              className="w-full justify-center"
            >
              {t.nav.signIn}
            </Button>
            <Button
              href="https://app.flae.ai/register"
              variant="primary"
              size="lg"
              className="w-full justify-center"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {t.nav.startBuildingMemory}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
