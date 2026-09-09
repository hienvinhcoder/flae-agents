"use client";

import React from "react";
import { Badge } from "../shared/Badge";
import { useI18n } from "../../i18n/I18nContext";
import { Network, Clock, ShieldCheck, ArrowRight, CheckCircle2, Sparkles, Layers, FileCheck } from "lucide-react";

export function ThreeDifferentiatorsSection() {
  const { t } = useI18n();
  const data = t.differentiators;

  const getPillarIcon = (id: string) => {
    switch (id) {
      case "relationships":
        return <Network className="w-5 h-5 text-[#818CF8]" />;
      case "time":
        return <Clock className="w-5 h-5 text-[#FB923C]" />;
      case "evidence":
        return <FileCheck className="w-5 h-5 text-[#14B8A6]" />;
      default:
        return <Sparkles className="w-5 h-5 text-[#FF5B26]" />;
    }
  };

  return (
    <section id="why-flae" className="relative py-20 sm:py-28 border-t border-[rgba(255,251,245,0.06)] bg-[#120D09] overflow-hidden">
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

        {/* Three Pillar Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {data.pillars.map((pillar) => (
            <div
              key={pillar.id}
              className="p-6 sm:p-7 rounded-[20px] bg-[#18130E] border border-[rgba(255,251,245,0.08)] flex flex-col justify-between gap-6 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/20 transition-all duration-200"
            >
              <div className="space-y-4">
                {/* Header & Icon */}
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    {getPillarIcon(pillar.id)}
                  </div>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#B7AB9A]">
                    {pillar.highlightBadge}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold font-display text-[#F5F0E8] mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#B7AB9A] leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>

              {/* Visual Flow / Entity Representation */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-[#EAE3D6]">
                  {pillar.visualFlow.map((node, i) => (
                    <React.Fragment key={i}>
                      {node.startsWith("→") ? (
                        <span className="text-[#6E6457]">{node}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#F5F0E8]">
                          {node}
                        </span>
                      )}
                      {i < pillar.visualFlow.length - 1 && !node.startsWith("→") && !pillar.visualFlow[i + 1].startsWith("→") ? (
                        <span className="text-[#FF5B26]">→</span>
                      ) : null}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
