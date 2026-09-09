"use client";

import React, { useState } from "react";
import { GlassCard } from "../shared/GlassCard";
import { Badge } from "../shared/Badge";
import { Button } from "../shared/Button";
import { GoogleDriveIcon, NotionIcon, SlackIcon, GitHubIcon, LinearIcon, JiraIcon } from "../icons/BrandIcons";
import { useI18n } from "../../i18n/I18nContext";
import { CheckCircle2, Shield, ArrowUpRight } from "lucide-react";

export function IntegrationsGrid() {
  const [filter, setFilter] = useState<"all" | "docs" | "code" | "chat">("all");
  const { t } = useI18n();

  const getConnectorIcon = (id: string) => {
    switch (id) {
      case "gdrive":
        return <GoogleDriveIcon className="w-8 h-8" />;
      case "notion":
        return <NotionIcon className="w-8 h-8 text-white" />;
      case "slack":
        return <SlackIcon className="w-8 h-8" />;
      case "github":
        return <GitHubIcon className="w-8 h-8 text-white" />;
      case "linear":
        return <LinearIcon className="w-8 h-8 text-white" />;
      case "jira":
        return <JiraIcon className="w-8 h-8" />;
      default:
        return null;
    }
  };

  const items = t.integrations.items;
  const filteredIntegrations = filter === "all" ? items : items.filter((i) => i.category === filter);

  return (
    <section id="integrations" className="relative py-20 sm:py-28 border-t border-[rgba(255,251,245,0.06)] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <Badge variant="orange" size="md" className="mb-4">
              {t.integrations.badge}
            </Badge>
            <h2 className="font-display font-semibold text-2xl sm:text-4xl text-[#F5F0E8] tracking-tight leading-tight">
              {t.integrations.title}
            </h2>
            <p className="mt-4 text-base text-[#B7AB9A] leading-relaxed">
              {t.integrations.subtitle}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-[rgba(255,251,245,0.04)] border border-[rgba(255,251,245,0.1)] self-start md:self-auto">
            <button
              onClick={() => setFilter("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === "all" ? "bg-[#FF5B26] text-white shadow-sm" : "text-[#B7AB9A] hover:text-white"
              }`}
            >
              {t.integrations.filters.all}
            </button>
            <button
              onClick={() => setFilter("docs")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === "docs" ? "bg-[#FF5B26] text-white shadow-sm" : "text-[#B7AB9A] hover:text-white"
              }`}
            >
              {t.integrations.filters.docs}
            </button>
            <button
              onClick={() => setFilter("code")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === "code" ? "bg-[#FF5B26] text-white shadow-sm" : "text-[#B7AB9A] hover:text-white"
              }`}
            >
              {t.integrations.filters.code}
            </button>
            <button
              onClick={() => setFilter("chat")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === "chat" ? "bg-[#FF5B26] text-white shadow-sm" : "text-[#B7AB9A] hover:text-white"
              }`}
            >
              {t.integrations.filters.chat}
            </button>
          </div>
        </div>

        {/* Connectors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIntegrations.map((item) => (
            <GlassCard key={item.id} interactive className="p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shadow-sm">
                    {getConnectorIcon(item.id)}
                  </div>
                  <Badge variant="synced" size="sm" dot>
                    {t.integrations.liveSynced}
                  </Badge>
                </div>

                <h3 className="text-lg font-semibold font-display text-[#F5F0E8] mb-2">
                  {item.name}
                </h3>

                <p className="text-xs sm:text-sm text-[#B7AB9A] leading-relaxed mb-6">
                  {item.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[rgba(255,251,245,0.08)] flex items-center justify-between text-xs font-mono text-[#EAE3D6]">
                <span className="flex items-center gap-1.5 text-[#14B8A6]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {item.syncType}
                </span>
                <span className="text-[#B7AB9A] font-tabular">{item.itemsCount}</span>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Security callout bottom banner */}
        <div className="mt-12 p-6 rounded-nav bg-[rgba(20,16,9,0.7)] border border-[rgba(255,251,245,0.12)] backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#FF5B26]/15 text-[#FB923C] border border-[#FF5B26]/30 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#F5F0E8] font-display">
                {t.integrations.securityBanner.title}
              </h4>
              <p className="text-xs text-[#B7AB9A]">
                {t.integrations.securityBanner.description}
              </p>
            </div>
          </div>

          <Button
            href="https://app.flae.ai/register"
            variant="secondary"
            size="sm"
            className="text-xs whitespace-nowrap shrink-0"
            icon={<ArrowUpRight className="w-3.5 h-3.5" />}
          >
            {t.integrations.securityBanner.cta}
          </Button>
        </div>
      </div>
    </section>
  );
}
