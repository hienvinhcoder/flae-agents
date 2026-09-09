"use client";

import React from "react";
import { Badge } from "../shared/Badge";
import { useI18n } from "../../i18n/I18nContext";
import { Plug, Brain, Sparkles, CheckCircle2, ArrowRight, Layers, Network, Bot } from "lucide-react";

export function HowItWorks() {
  const { t } = useI18n();
  const data = t.howItWorks;

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1:
        return <Plug className="w-6 h-6 text-[#FB923C]" />;
      case 2:
        return <Network className="w-6 h-6 text-[#818CF8]" />;
      case 3:
        return <Bot className="w-6 h-6 text-[#14B8A6]" />;
      default:
        return <Sparkles className="w-6 h-6 text-[#FF5B26]" />;
    }
  };

  return (
    <section id="how-it-works" className="relative py-20 sm:py-28 border-t border-[rgba(255,251,245,0.06)] bg-[#120D09] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <Badge variant="eyebrow" size="md" className="mb-4" icon={<Layers className="w-3.5 h-3.5 text-[#FF5B26]" />}>
            {data.badge}
          </Badge>
          <h2 className="font-display font-semibold text-2xl sm:text-4xl lg:text-[40px] text-[#F5F0E8] tracking-tight leading-tight">
            {data.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base lg:text-lg text-[#B7AB9A] leading-relaxed">
            {data.subtitle}
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {data.steps.map((item) => (
            <div
              key={item.step}
              className="p-6 sm:p-8 rounded-[20px] bg-[#18130E] border border-[rgba(255,251,245,0.08)] flex flex-col justify-between gap-6 shadow-[0_8px_24px_rgba(0,0,0,0.4)] relative"
            >
              <div className="space-y-4">
                {/* Step number badge & icon */}
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    {getStepIcon(item.step)}
                  </div>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#FB923C] font-semibold">
                    0{item.step}
                  </span>
                </div>

                {/* Heading */}
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#6E6457] block mb-1">
                    {item.subtitle}
                  </span>
                  <h3 className="text-base sm:text-lg font-semibold font-display text-[#F5F0E8] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#B7AB9A] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Bullets */}
              <div className="space-y-2 pt-4 border-t border-[rgba(255,251,245,0.06)]">
                {item.bullets.map((bullet, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[#EAE3D6] leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6] shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
