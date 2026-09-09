"use client";

import React from "react";
import { Badge } from "../shared/Badge";
import { useI18n } from "../../i18n/I18nContext";
import { SlackIcon, GitHubIcon, NotionIcon, FlaeLogoIcon } from "../icons/BrandIcons";
import { ArrowRight, AlertTriangle, CheckCircle2, GitPullRequest, MessageSquare, FileText, Sparkles } from "lucide-react";

export function ContextTimelineSection() {
  const { t } = useI18n();
  const data = t.contextTimeline;

  const getSourceIcon = (type: "decision" | "code" | "doc") => {
    switch (type) {
      case "decision":
        return <SlackIcon className="w-4 h-4" />;
      case "code":
        return <GitHubIcon className="w-4 h-4 text-white" />;
      case "doc":
        return <NotionIcon className="w-4 h-4 text-white" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <section id="context-timeline" className="relative py-20 sm:py-28 border-t border-[rgba(255,251,245,0.06)] bg-[#140F0B] overflow-hidden">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-75 rounded-full bg-[#FF5B26]/5 blur-[160px]"
          aria-hidden="true"
        />
      </div>

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

        {/* Timeline Visualization: 3 Source Steps + 1 Synthesis Output */}
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Horizontal Step Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 relative">
            {data.timeline.map((item, idx) => (
              <div
                key={idx}
                className="relative rounded-2xl p-5 bg-[#1A140F] border border-[rgba(255,251,245,0.08)] flex flex-col justify-between gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
              >
                {/* Step Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-white/5 border border-white/10">
                      {getSourceIcon(item.badgeType)}
                    </div>
                    <span className="text-xs font-mono text-[#B7AB9A]">{item.source}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                      item.badgeType === "decision"
                        ? "bg-[#6366F1]/15 text-[#A5B4FC] border border-[#6366F1]/30"
                        : item.badgeType === "code"
                        ? "bg-[#FF5B26]/15 text-[#FB923C] border border-[#FF5B26]/30"
                        : "bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30"
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>

                {/* Quote Content */}
                <div className="p-3 rounded-[10px] bg-black/30 border border-white/5 text-xs sm:text-sm text-[#EAE3D6] italic leading-relaxed">
                  {item.quote}
                </div>

                {/* Subtext info */}
                <div className="text-[11px] font-mono text-[#6E6457] pt-2 border-t border-[rgba(255,251,245,0.05)] flex items-center justify-between">
                  <span>{item.subtext}</span>
                  {item.badgeType === "doc" ? (
                    <span className="text-[#F59E0B] font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Stale
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Central Connecting Flow Bar */}
          <div className="flex items-center justify-center gap-3 text-xs font-mono text-[#6E6457]">
            <span className="h-px bg-[rgba(255,251,245,0.1)] flex-1 hidden sm:block" />
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#B7AB9A] flex items-center gap-1.5">
              <FlaeLogoIcon className="w-3.5 h-3.5" />
              Connected &amp; Synthesized by FLAE
            </span>
            <span className="h-px bg-[rgba(255,251,245,0.1)] flex-1 hidden sm:block" />
          </div>

          {/* FLAE Current Understanding Box */}
          <div className="p-6 sm:p-7 rounded-nav bg-[rgba(20,184,166,0.03)] border border-[#14B8A6]/30 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#14B8A6] flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {data.summary.label}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#F5F0E8] font-display">
                  {data.summary.heading}
                </h3>
                <p className="text-xs sm:text-sm text-[#B7AB9A] leading-relaxed">
                  {data.summary.detail}
                </p>
              </div>

              <div className="shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/25 font-mono text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Multi-Source Grounded
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
