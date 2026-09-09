"use client";

import React from "react";
import { GlassCard } from "../shared/GlassCard";
import { Badge } from "../shared/Badge";
import { useI18n } from "../../i18n/I18nContext";
import { ShieldCheck, FileCheck, Lock, Building2, CheckCircle2, Sparkles, Server } from "lucide-react";

export function EnterpriseSecurity() {
  const { t } = useI18n();

  const pillarIcons = [
    <Lock key="1" className="w-5 h-5 text-[#14B8A6]" />,
    <FileCheck key="2" className="w-5 h-5 text-[#FB923C]" />,
    <Server key="3" className="w-5 h-5 text-[#818CF8]" />,
  ];

  const pillars = t.architecture.pillars;

  return (
    <section id="security" className="relative py-20 sm:py-28 border-t border-[rgba(255,251,245,0.06)] bg-[#120D09] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <Badge variant="eyebrow" size="md" className="mb-4" icon={<ShieldCheck className="w-3.5 h-3.5 text-[#14B8A6]" />}>
            {t.architecture.badge}
          </Badge>
          <h2 className="font-display font-semibold text-2xl sm:text-4xl lg:text-[40px] text-[#F5F0E8] tracking-tight leading-tight">
            {t.architecture.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base lg:text-lg text-[#B7AB9A] leading-relaxed">
            {t.architecture.subtitle}
          </p>
        </div>

        {/* 3 Architecture Pillars Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {pillars.map((p, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-7 rounded-[20px] bg-[#18130E] border border-[rgba(255,251,245,0.08)] flex flex-col justify-between gap-6 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shadow-sm">
                    {pillarIcons[idx % pillarIcons.length]}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold font-display text-[#F5F0E8]">
                      {p.title}
                    </h3>
                    <span className="text-xs font-mono text-[#FB923C] block">
                      {p.subtitle}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#B7AB9A] leading-relaxed">
                  {p.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[rgba(255,251,245,0.06)] flex flex-wrap gap-2">
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-[rgba(255,251,245,0.03)] text-[#EAE3D6] border border-[rgba(255,251,245,0.08)]"
                  >
                    <CheckCircle2 className="w-3 h-3 text-[#14B8A6]" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
