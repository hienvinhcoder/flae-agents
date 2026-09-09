"use client";

import React from "react";
import { FlaeLogoIcon, GitHubIcon } from "../icons/BrandIcons";
import { Button } from "../shared/Button";
import { LanguageSwitcher } from "../shared/LanguageSwitcher";
import { useI18n } from "../../i18n/I18nContext";
import { ArrowRight, Sparkles, ExternalLink, ShieldCheck } from "lucide-react";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="relative border-t border-[rgba(255,251,245,0.06)] bg-[#100B07] overflow-hidden">
      {/* Subtle Ember Ambient Glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-162.5 h-62.5 rounded-full bg-[#7C2D12] opacity-15 blur-[150px] -z-10" />

      {/* Pre-Footer Final CTA Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-16">
        <div className="relative rounded-[20px] p-8 sm:p-14 bg-[#18130E] border border-[rgba(255,251,245,0.1)] shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center overflow-hidden">
          
          <div className="max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5B26]/15 text-[#FB923C] font-mono text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#FF5B26]" /> {t.footer.ctaBadge}
            </div>

            <h2 className="font-display font-semibold text-2xl sm:text-4xl lg:text-[42px] text-[#F5F0E8] tracking-tight leading-tight">
              {t.footer.ctaTitleStart}
              <span className="bg-linear-to-r from-[#FF5B26] via-[#FB923C] to-[#FDE047] bg-clip-text text-transparent">
                {t.footer.ctaTitleHighlight}
              </span>
            </h2>

            <p className="mt-4 text-sm sm:text-base text-[#B7AB9A] leading-relaxed max-w-xl mx-auto">
              {t.footer.ctaSubtitle}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                href="https://app.flae.ai/register"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold shadow-[0_0_24px_rgba(249,115,22,0.4)]"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {t.footer.ctaButton}
              </Button>
              <Button
                href="#why-flae"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto px-6 py-3.5 text-base"
                icon={<Sparkles className="w-4 h-4 text-[#FB923C]" />}
                iconPosition="left"
              >
                {t.footer.ctaButtonSecondary}
              </Button>
            </div>

            <p className="mt-4 text-xs font-mono text-[#6E6457]">
              {t.footer.ctaNote}
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-[rgba(255,251,245,0.06)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <FlaeLogoIcon className="w-7 h-7" />
                <span className="font-display font-semibold text-xl text-[#F5F0E8] tracking-tight">
                  FLAE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#B7AB9A] max-w-sm leading-relaxed mb-4">
                {t.footer.brandSummary}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
                {t.common.allSystemsOperational}
              </span>
              <LanguageSwitcher />
            </div>
          </div>

          {/* Links Column 1: Product */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#F5F0E8] font-semibold mb-4">
              {t.footer.columns.product.title}
            </h4>
            <ul className="space-y-2.5 text-xs text-[#B7AB9A]">
              <li>
                <a href="#how-it-works" className="hover:text-[#F5F0E8] transition-colors">
                  {t.footer.columns.product.howItWorks}
                </a>
              </li>
              <li>
                <a href="#why-flae" className="hover:text-[#F5F0E8] transition-colors">
                  {t.footer.columns.product.whyFlae}
                </a>
              </li>
              <li>
                <a href="#integrations" className="hover:text-[#F5F0E8] transition-colors">
                  {t.footer.columns.product.connectors}
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-[#F5F0E8] transition-colors">
                  {t.footer.columns.product.architecture}
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-[#F5F0E8] transition-colors">
                  {t.footer.columns.product.pricing}
                </a>
              </li>
            </ul>
          </div>

          {/* Links Column 2: AI Assistants */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#F5F0E8] font-semibold mb-4">
              {t.footer.columns.agents.title}
            </h4>
            <ul className="space-y-2.5 text-xs text-[#B7AB9A]">
              <li>
                <a href="#ai-agents" className="hover:text-[#F5F0E8] transition-colors flex items-center gap-1">
                  {t.footer.columns.agents.claude} <ExternalLink className="w-3 h-3 text-[#6E6457]" />
                </a>
              </li>
              <li>
                <a href="#ai-agents" className="hover:text-[#F5F0E8] transition-colors flex items-center gap-1">
                  {t.footer.columns.agents.chatgpt} <ExternalLink className="w-3 h-3 text-[#6E6457]" />
                </a>
              </li>
              <li>
                <a href="#ai-agents" className="hover:text-[#F5F0E8] transition-colors">
                  {t.footer.columns.agents.copilot}
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-[#F5F0E8] transition-colors">
                  {t.footer.columns.agents.provenance}
                </a>
              </li>
              <li>
                <a href="https://github.com/flae/core-agents" target="_blank" rel="noreferrer" className="hover:text-[#F5F0E8] transition-colors flex items-center gap-1">
                  {t.footer.columns.agents.openCore} <GitHubIcon className="w-3 h-3 text-white" />
                </a>
              </li>
            </ul>
          </div>

          {/* Links Column 3: Trust & Security */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#F5F0E8] font-semibold mb-4">
              {t.footer.columns.security.title}
            </h4>
            <ul className="space-y-2.5 text-xs text-[#B7AB9A]">
              <li>
                <a href="#security" className="hover:text-[#F5F0E8] transition-colors">
                  {t.footer.columns.security.rbac}
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-[#F5F0E8] transition-colors">
                  {t.footer.columns.security.sync}
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-[#F5F0E8] transition-colors">
                  {t.footer.columns.security.enterprise}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#F5F0E8] transition-colors">
                  {t.footer.columns.security.privacy}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#F5F0E8] transition-colors">
                  {t.footer.columns.security.terms}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="mt-12 pt-6 border-t border-[rgba(255,251,245,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6E6457] font-mono">
          <div>
            &copy; {new Date().getFullYear()} {t.footer.allRightsReserved}
          </div>
          <div className="flex items-center gap-4 text-[#B7AB9A]">
            <span>{t.footer.craftedText}</span>
            <span>&bull;</span>
            <a href="https://github.com/flae/core-agents" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              GitHub
            </a>
            <span>&bull;</span>
            <a href="https://twitter.com/flae_ai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              Twitter / X
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
