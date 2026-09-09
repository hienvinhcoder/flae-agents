"use client";

import React, { useState } from "react";
import { Badge } from "../shared/Badge";
import { NotionIcon, SlackIcon, GoogleDriveIcon, GitHubIcon, FlaeLogoIcon } from "../icons/BrandIcons";
import { useI18n } from "../../i18n/I18nContext";
import {
  AlertTriangle,
  GitPullRequest,
  FileCode,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  Network,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

export function HeroKnowledgeVisual() {
  const { t } = useI18n();
  const [showGraph, setShowGraph] = useState(false);
  const demo = t.heroDemo;

  const getSourceIcon = (type: "pr" | "code" | "doc") => {
    switch (type) {
      case "pr":
        return <GitPullRequest className="w-4 h-4 text-[#FB923C]" />;
      case "code":
        return <FileCode className="w-4 h-4 text-[#818CF8]" />;
      case "doc":
        return <FileText className="w-4 h-4 text-[#F59E0B]" />;
      default:
        return <FileText className="w-4 h-4 text-[#B7AB9A]" />;
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto lg:max-w-none">
      {/* Outer Solid / Subtle Glass Container */}
      <div className="relative rounded-[20px] bg-[#17120D] border border-[rgba(255,251,245,0.12)] shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden transition-all duration-300">
        
        {/* Top Window Bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[rgba(255,251,245,0.06)] bg-[rgba(255,251,245,0.02)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]/70" />
            </div>
            <div className="h-3.5 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#EAE3D6]">
              <FlaeLogoIcon className="w-3.5 h-3.5" />
              <span className="text-[#F5F0E8] font-medium">{demo.windowTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGraph(!showGraph)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono flex items-center gap-1.5 border transition-all cursor-pointer ${
                showGraph
                  ? "bg-[#6366F1]/20 border-[#818CF8]/40 text-[#A5B4FC]"
                  : "bg-white/5 border-white/10 text-[#B7AB9A] hover:text-[#F5F0E8] hover:bg-white/10"
              }`}
              title="Toggle Knowledge Graph View"
            >
              <Network className="w-3 h-3 text-[#818CF8]" />
              <span className="hidden sm:inline">Context Graph</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/25 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
              Live
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          
          {/* 1. Question Prompt Card */}
          <div className="p-3.5 sm:p-4 rounded-card bg-[rgba(255,251,245,0.03)] border border-[rgba(255,251,245,0.08)] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#B7AB9A]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FB923C]" />
                {demo.askerLabel}
              </span>
              <span className="text-[#6E6457]">Ask FLAE</span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-[#F5F0E8] tracking-tight">
              &quot;{demo.question}&quot;
            </p>
          </div>

          {/* 2. Main FLAE Context Synthesis */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[rgba(255,91,38,0.02)] border border-[#FF5B26]/25 space-y-3 relative">
            
            {/* Header: Status & Outdated Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-linear-to-br from-[#FF5B26] to-[#7C2D12]">
                  <FlaeLogoIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold font-display text-[#F5F0E8]">
                  {demo.answerTitle}
                </span>
              </div>

              {/* Warning Alert Badge: Documentation Stale */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/35 text-[#FBBF24] font-mono text-[11px] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                {demo.staleAlertBadge}
              </span>
            </div>

            {/* Answer statement */}
            <div className="space-y-1.5">
              <p className="text-sm sm:text-[15px] font-bold text-[#F5F0E8]">
                {demo.answerStatus}
              </p>
              <p className="text-xs sm:text-sm text-[#EAE3D6] leading-relaxed">
                {demo.answerDetail}
              </p>
            </div>

            {/* Graph Visualization (Subtle & Contextual) */}
            {showGraph ? (
              <div className="mt-4 p-4 rounded-xl bg-black/40 border border-[#818CF8]/30 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#A5B4FC]">
                  <span className="flex items-center gap-1.5">
                    <Network className="w-3.5 h-3.5" />
                    {demo.graph.title}
                  </span>
                  <span className="text-[10px] text-[#6E6457]">Text-Graph Bidirectional</span>
                </div>

                {/* Visual relationship tree */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-[#FF5B26]/10 border border-[#FF5B26]/30 text-center">
                    <span className="text-[10px] text-[#FB923C] block font-semibold">PR #184 (Code)</span>
                    <span className="text-[#F5F0E8] text-[11px]">currency added</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#818CF8]/10 border border-[#818CF8]/30 text-center">
                    <span className="text-[10px] text-[#818CF8] block font-semibold">Billing Charge API</span>
                    <span className="text-[#F5F0E8] text-[11px]">POST /billing/charge</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-center">
                    <span className="text-[10px] text-[#F59E0B] block font-semibold">Notion Docs (Wiki)</span>
                    <span className="text-[#FBBF24] text-[11px]">⚠ Missing parameter</span>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-[#B7AB9A] text-center pt-1">
                  PR #184 <span className="text-[#FB923C]">→ changed →</span> Billing API <span className="text-[#F59E0B]">→ documented_by (stale) →</span> Notion Docs
                </div>
              </div>
            ) : null}

            {/* Evidence & Provenance Chips */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#B7AB9A]">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <Sparkles className="w-3 h-3 text-[#FB923C]" />
                  {demo.sourcesTitle}
                </span>
                <span className="text-[10px] text-[#6E6457]">3 Sources Linked</span>
              </div>

              <div className="space-y-1.5">
                {demo.sources.map((src) => (
                  <div
                    key={src.id}
                    className="p-2.5 rounded-[10px] bg-[rgba(255,251,245,0.03)] border border-[rgba(255,251,245,0.07)] hover:border-white/20 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1 rounded bg-white/5 border border-white/10 shrink-0">
                        {getSourceIcon(src.type)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-[#F5F0E8] block truncate">
                          {src.title}
                        </span>
                        <span className="text-[10px] font-mono text-[#B7AB9A] block truncate">
                          {src.source} • {src.timestamp}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono shrink-0 font-medium ${
                        src.type === "pr"
                          ? "bg-[#FF5B26]/15 text-[#FB923C] border border-[#FF5B26]/30"
                          : src.type === "code"
                          ? "bg-[#818CF8]/15 text-[#A5B4FC] border border-[#818CF8]/30"
                          : "bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30"
                      }`}
                    >
                      {src.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: MCP Agent Sync Indicator */}
        <div className="px-4 sm:px-6 py-2.5 bg-black/40 border-t border-[rgba(255,251,245,0.06)] flex items-center justify-between text-[11px] font-mono text-[#B7AB9A]">
          <span className="flex items-center gap-1.5 text-[#14B8A6]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Source Provenance
          </span>
          <span className="text-[#6E6457]">
            Available via MCP &amp; REST
          </span>
        </div>
      </div>
    </div>
  );
}
