"use client";

import React from "react";
import { Badge } from "../shared/Badge";
import { useI18n } from "../../i18n/I18nContext";
import { FlaeLogoIcon } from "../icons/BrandIcons";
import { Sparkles, CheckCircle2, XCircle, ArrowRight, Cpu, Network } from "lucide-react";

export function SearchVsContextSection() {
  const { t } = useI18n();
  const data = t.techComparison;

  return (
    <section id="comparison" className="relative py-20 sm:py-28 border-t border-[rgba(255,251,245,0.06)] bg-[#140F0B] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <Badge variant="orange" size="md" className="mb-4" icon={<Sparkles className="w-3.5 h-3.5" />}>
            {data.badge}
          </Badge>
          <h2 className="font-display font-semibold text-2xl sm:text-4xl lg:text-[40px] text-[#F5F0E8] tracking-tight leading-tight">
            {data.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base lg:text-lg text-[#B7AB9A] leading-relaxed">
            {data.subtitle}
          </p>
        </div>

        {/* Comparison Table / Grid */}
        <div className="max-w-5xl mx-auto rounded-[20px] bg-[#19140F] border border-[rgba(255,251,245,0.08)] shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden">
          
          {/* Table Header */}
          <div className="grid grid-cols-1 md:grid-cols-12 border-b border-[rgba(255,251,245,0.08)] bg-black/40">
            <div className="md:col-span-4 p-4 sm:p-5 text-xs font-mono uppercase tracking-wider text-[#6E6457] hidden md:block">
              Capability
            </div>
            <div className="md:col-span-4 p-4 sm:p-5 border-t md:border-t-0 md:border-l border-[rgba(255,251,245,0.08)] flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#B7AB9A]">
              <XCircle className="w-4 h-4 text-[#EF4444]" />
              {data.conventionalHeader}
            </div>
            <div className="md:col-span-4 p-4 sm:p-5 border-t md:border-t-0 md:border-l border-[rgba(255,251,245,0.08)] bg-[#FF5B26]/5 flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#FB923C]">
              <FlaeLogoIcon className="w-4 h-4" />
              {data.flaeHeader}
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-[rgba(255,251,245,0.06)]">
            {data.rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 hover:bg-white/1 transition-colors">
                
                {/* Dimension label */}
                <div className="md:col-span-4 p-4 sm:p-5 font-mono text-xs font-semibold text-[#EAE3D6] flex items-center bg-black/10">
                  {row.dimension}
                </div>

                {/* Conventional Search */}
                <div className="md:col-span-4 p-4 sm:p-5 md:border-l border-[rgba(255,251,245,0.06)] text-xs sm:text-sm text-[#B7AB9A] leading-relaxed flex items-start gap-2">
                  <span className="text-[#EF4444] shrink-0 mt-0.5">•</span>
                  <span>{row.conventional}</span>
                </div>

                {/* FLAE Context Layer */}
                <div className="md:col-span-4 p-4 sm:p-5 md:border-l border-[rgba(255,251,245,0.06)] bg-[#FF5B26]/2 text-xs sm:text-sm text-[#F5F0E8] font-medium leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
                  <span>{row.flae}</span>
                </div>

              </div>
            ))}
          </div>

          {/* Technical Footnote */}
          <div className="p-4 sm:p-5 bg-black/40 border-t border-[rgba(255,251,245,0.08)] flex items-start sm:items-center gap-3 text-xs font-mono text-[#B7AB9A]">
            <Cpu className="w-4 h-4 text-[#818CF8] shrink-0 mt-0.5 sm:mt-0" />
            <p className="leading-relaxed">
              {data.footnote}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
