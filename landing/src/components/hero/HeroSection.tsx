"use client";

import React from "react";
import { Badge } from "../shared/Badge";
import { Button } from "../shared/Button";
import { HeroKnowledgeVisual } from "./HeroKnowledgeVisual";
import { useI18n } from "../../i18n/I18nContext";
import { ArrowRight, Sparkles, Network } from "lucide-react";

export function HeroSection() {
  const { t } = useI18n();

  return (
    <section className="relative pt-8 sm:pt-14 pb-16 sm:pb-24 overflow-hidden">
      {/* Reduced Ambient Background (50% softer for clean technical look) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Soft top orange orb */}
        <div
          className="absolute -top-25 left-[15%] w-112.5 h-112.5 rounded-full bg-[#F97316] opacity-15 blur-[130px]"
          aria-hidden="true"
        />
        {/* Soft center amber glow */}
        <div
          className="absolute top-65 right-[10%] w-100 h-100 rounded-full bg-[#FB923C] opacity-10 blur-[140px]"
          aria-hidden="true"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 40 / 60 Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: 40% Width (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col items-start text-left">
            
            {/* Eyebrow badge */}
            <div className="mb-5 inline-flex items-center">
              <Badge variant="eyebrow" size="md" icon={<Sparkles className="w-3.5 h-3.5 text-[#FF5B26]" />}>
                {t.hero.eyebrow}
              </Badge>
            </div>

            {/* Display Heading */}
            <h1 className="font-display font-semibold text-3xl sm:text-4xl lg:text-[46px] leading-[1.14] sm:leading-[1.16] tracking-[-0.02em] text-[#F5F0E8] text-balance">
              {t.hero.titleStart}
              <span className="bg-linear-to-r from-[#FF5B26] via-[#FB923C] to-[#FDE047] bg-clip-text text-transparent">
                {t.hero.titleHighlight}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-sm sm:text-base lg:text-[17px] leading-relaxed text-[#B7AB9A] font-sans font-normal text-balance">
              {t.hero.subtitle}
            </p>

            {/* Action CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
              <Button
                href="https://app.flae.ai/register"
                variant="primary"
                size="lg"
                className="px-6 py-3 text-sm sm:text-base font-semibold shadow-[0_0_24px_rgba(249,115,22,0.35)] justify-center"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {t.hero.primaryCta}
              </Button>
              <Button
                href="#context-timeline"
                variant="secondary"
                size="lg"
                className="px-5 py-3 text-sm sm:text-base justify-center"
                icon={<Network className="w-4 h-4 text-[#FB923C]" />}
                iconPosition="left"
              >
                {t.hero.secondaryCta}
              </Button>
            </div>

            {/* Clean Connectors Strip */}
            <div className="mt-8 pt-6 border-t border-[rgba(255,251,245,0.06)] w-full">
              <span className="text-[11px] font-mono text-[#6E6457] uppercase tracking-wider block mb-2">
                Supported Sources &amp; Agents
              </span>
              <p className="text-xs font-mono text-[#B7AB9A]">
                {t.hero.connectorsLabel}
              </p>
            </div>
          </div>

          {/* Right Column: 60% Width (7 cols on lg) */}
          <div className="lg:col-span-7 w-full">
            <HeroKnowledgeVisual />
          </div>

        </div>
      </div>
    </section>
  );
}
