"use client";

import React, { useState } from "react";
import { Badge } from "../shared/Badge";
import { useI18n } from "../../i18n/I18nContext";
import { FlaeLogoIcon, GitHubIcon, NotionIcon, SlackIcon } from "../icons/BrandIcons";
import {
  Code2,
  Compass,
  Briefcase,
  UserCheck,
  CheckCircle2,
  Quote,
  Sparkles,
  ArrowRight,
  FileText,
  Network
} from "lucide-react";

export function UseCasesSection() {
  const { t } = useI18n();
  const data = t.useCases;
  const [activeTabId, setActiveTabId] = useState(data.tabs[0].id);

  const activeTab = data.tabs.find((tab) => tab.id === activeTabId) || data.tabs[0];

  const getTabIcon = (id: string) => {
    switch (id) {
      case "engineering":
        return <Code2 className="w-4 h-4" />;
      case "product":
        return <Compass className="w-4 h-4" />;
      case "leadership":
        return <Briefcase className="w-4 h-4" />;
      case "onboarding":
        return <UserCheck className="w-4 h-4" />;
      default:
        return <Code2 className="w-4 h-4" />;
    }
  };

  return (
    <section id="use-cases" className="relative py-20 sm:py-28 border-t border-[rgba(255,251,245,0.06)] bg-[#140F0B] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <Badge variant="orange" size="md" className="mb-4" icon={<Sparkles className="w-3.5 h-3.5" />}>
            {data.badge}
          </Badge>
          <h2 className="font-display font-semibold text-2xl sm:text-4xl lg:text-[40px] text-[#F5F0E8] tracking-tight leading-tight">
            {data.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base lg:text-lg text-[#B7AB9A] leading-relaxed">
            {data.subtitle}
          </p>

          {/* Interactive Role Tabs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {data.tabs.map((tab) => {
              const isSelected = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-[#FF5B26] text-white shadow-[0_0_20px_rgba(249,115,22,0.35)]"
                      : "bg-white/5 text-[#B7AB9A] border border-white/10 hover:bg-white/10 hover:text-[#F5F0E8]"
                  }`}
                >
                  {getTabIcon(tab.id)}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Scenario Card */}
        <div className="max-w-4xl mx-auto rounded-[20px] bg-[#19140F] border border-[rgba(255,251,245,0.08)] p-6 sm:p-8 shadow-[0_16px_48px_rgba(0,0,0,0.6)] space-y-6">
          
          {/* Question Header */}
          <div className="p-4 sm:p-5 rounded-card bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-[#B7AB9A]">
              <span className="text-[#FB923C] font-semibold">{activeTab.role}</span>
              <span>{data.questionLabel}</span>
            </div>
            <p className="text-base sm:text-lg font-semibold text-[#F5F0E8] tracking-tight">
              &quot;{activeTab.question}&quot;
            </p>
          </div>

          {/* FLAE Answer */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[rgba(20,184,166,0.03)] border border-[#14B8A6]/25 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-linear-to-br from-[#FF5B26] to-[#7C2D12]">
                <FlaeLogoIcon className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold font-display text-[#F5F0E8]">
                FLAE Synthesized Context
              </span>
              <span className="text-xs text-[#14B8A6] font-mono ml-auto flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            </div>

            <p className="text-sm sm:text-[15px] text-[#EAE3D6] leading-relaxed font-medium">
              {activeTab.flaeAnswer}
            </p>
          </div>

          {/* Context Reasoning Path */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#6E6457] flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-[#818CF8]" />
              {data.reasoningLabel}:
            </span>
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-black/30 border border-white/5 text-xs font-mono text-[#EAE3D6]">
              {activeTab.reasoningChain.map((step, idx) => (
                <React.Fragment key={idx}>
                  <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[#F5F0E8]">
                    {step}
                  </span>
                  {idx < activeTab.reasoningChain.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-[#FF5B26] shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Evidence Badges */}
          <div className="space-y-2 pt-2 border-t border-[rgba(255,251,245,0.06)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#6E6457] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#FB923C]" />
              {data.evidenceLabel}:
            </span>
            <div className="flex flex-wrap gap-2">
              {activeTab.evidence.map((ev, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#B7AB9A] flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />
                  {ev}
                </span>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
