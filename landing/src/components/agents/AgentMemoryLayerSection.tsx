"use client";

import React from "react";
import { Badge } from "../shared/Badge";
import { useI18n } from "../../i18n/I18nContext";
import { ClaudeIcon, CursorIcon, OpenAIIcon, FlaeLogoIcon, GitHubIcon, NotionIcon, SlackIcon, GoogleDriveIcon } from "../icons/BrandIcons";
import { ArrowDown, ArrowUp, Cpu, Network, ShieldCheck, Zap, Sparkles, Terminal } from "lucide-react";

export function AgentMemoryLayerSection() {
  const { t } = useI18n();
  const data = t.agentMemory;

  const getAgentIcon = (id: string) => {
    switch (id) {
      case "claude":
        return <ClaudeIcon className="w-5 h-5 text-[#D97706]" />;
      case "cursor":
        return <CursorIcon className="w-5 h-5 text-white" />;
      case "chatgpt":
        return <OpenAIIcon className="w-5 h-5 text-[#10A37F]" />;
      case "codex":
        return <Terminal className="w-5 h-5 text-[#818CF8]" />;
      default:
        return <Cpu className="w-5 h-5 text-[#FF5B26]" />;
    }
  };

  return (
    <section id="ai-agents" className="relative py-20 sm:py-28 border-t border-[rgba(255,251,245,0.06)] bg-[#120D09] overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-162.5 h-87.5 rounded-full bg-[#818CF8]/5 blur-[160px]"
          aria-hidden="true"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <Badge variant="mcp" size="md" className="mb-4" icon={<Network className="w-3.5 h-3.5 text-[#818CF8]" />}>
            {data.badge}
          </Badge>
          <h2 className="font-display font-semibold text-2xl sm:text-4xl lg:text-[40px] text-[#F5F0E8] tracking-tight leading-tight">
            {data.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base lg:text-lg text-[#B7AB9A] leading-relaxed">
            {data.subtitle}
          </p>
        </div>

        {/* Central Hub Architecture Diagram */}
        <div className="max-w-4xl mx-auto rounded-[20px] bg-[#18130E] border border-[rgba(255,251,245,0.08)] p-6 sm:p-10 shadow-[0_16px_48px_rgba(0,0,0,0.6)] mb-12">
          
          {/* 1. Sources Strip (Incoming) */}
          <div className="text-center mb-6">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#6E6457] block mb-3">
              1. Continuous Knowledge Sources
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {data.connectedSources.map((source, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-[#EAE3D6] flex items-center gap-1.5"
                >
                  {source === "Slack" && <SlackIcon className="w-3.5 h-3.5" />}
                  {source === "Notion" && <NotionIcon className="w-3.5 h-3.5 text-white" />}
                  {source === "Google Drive" && <GoogleDriveIcon className="w-3.5 h-3.5" />}
                  {source === "GitHub" && <GitHubIcon className="w-3.5 h-3.5 text-white" />}
                  {source}
                </span>
              ))}
            </div>
          </div>

          {/* Connector Down Arrow */}
          <div className="flex justify-center my-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-[#B7AB9A]">
              <ArrowDown className="w-3.5 h-3.5 text-[#FF5B26]" />
              Continuous Ingestion &amp; Graph Building
            </div>
          </div>

          {/* 2. Central Core: FLAE Living Context Layer (MCP Server) */}
          <div className="my-6 p-6 sm:p-7 rounded-nav bg-linear-to-b from-[#FF5B26]/10 to-[#140F0B] border border-[#FF5B26]/30 text-center shadow-[0_0_30px_rgba(249,115,22,0.1)] relative">
            <div className="inline-flex p-2.5 rounded-xl bg-linear-to-br from-[#FF5B26] to-[#7C2D12] mb-3 shadow-[0_0_16px_rgba(249,115,22,0.4)]">
              <FlaeLogoIcon className="w-7 h-7" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-display text-[#F5F0E8] mb-1">
              FLAE Living Context Layer
            </h3>
            <p className="text-xs sm:text-sm text-[#B7AB9A] max-w-md mx-auto mb-3">
              Standard Model Context Protocol (MCP) Server &amp; Unified Knowledge API
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-[#FB923C]">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF5B26]/10 border border-[#FF5B26]/20">
                mcp://api.flae.ai/v1
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20">
                Zero Retraining Required
              </span>
            </div>
          </div>

          {/* Connector Down Arrow */}
          <div className="flex justify-center my-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-[#B7AB9A]">
              <ArrowDown className="w-3.5 h-3.5 text-[#818CF8]" />
              Context Streaming &amp; Tool Calling
            </div>
          </div>

          {/* 3. AI Agents Grid (Outgoing / Consumers) */}
          <div className="mt-6">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#6E6457] block text-center mb-3">
              2. Consumed by Every Assistant &amp; Autonomous Agent
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {data.connectedAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 transition-colors text-center space-y-1.5"
                >
                  <div className="flex justify-center mb-1">
                    {getAgentIcon(agent.id)}
                  </div>
                  <span className="text-xs font-semibold text-[#F5F0E8] block">
                    {agent.name}
                  </span>
                  <span className="text-[10px] font-mono text-[#B7AB9A] block leading-tight">
                    {agent.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* 3 Value Pillars for Agent Infrastructure */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {data.capabilities.map((cap, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[#18130E] border border-[rgba(255,251,245,0.06)] space-y-2"
            >
              <h4 className="text-sm font-semibold text-[#F5F0E8] font-display flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5B26]" />
                {cap.title}
              </h4>
              <p className="text-xs text-[#B7AB9A] leading-relaxed">
                {cap.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
