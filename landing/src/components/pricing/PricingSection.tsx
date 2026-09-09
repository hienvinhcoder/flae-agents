"use client";

import React, { useState } from "react";
import { GlassCard } from "../shared/GlassCard";
import { Badge } from "../shared/Badge";
import { Button } from "../shared/Button";
import { useI18n } from "../../i18n/I18nContext";
import { Check, Sparkles, ArrowRight } from "lucide-react";

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const { t } = useI18n();

  const plans = t.pricing.plans;

  return (
    <section id="pricing" className="relative py-20 sm:py-28 border-t border-[rgba(255,251,245,0.06)] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="orange" size="md" className="mb-4">
            {t.pricing.badge}
          </Badge>
          <h2 className="font-display font-semibold text-2xl sm:text-4xl lg:text-[40px] text-[#F5F0E8] tracking-tight leading-tight">
            {t.pricing.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#B7AB9A] leading-relaxed">
            {t.pricing.subtitle}
          </p>

          {/* Annual vs Monthly toggle */}
          <div className="mt-8 inline-flex items-center gap-3 p-1.5 rounded-full bg-[rgba(255,251,245,0.04)] border border-[rgba(255,251,245,0.1)]">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-[rgba(255,251,245,0.12)] text-[#F5F0E8]"
                  : "text-[#B7AB9A] hover:text-[#F5F0E8]"
              }`}
            >
              {t.pricing.billingToggle.monthly}
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                billingCycle === "annual"
                  ? "bg-[#FF5B26] text-white shadow-sm"
                  : "text-[#B7AB9A] hover:text-[#F5F0E8]"
              }`}
            >
              <span>{t.pricing.billingToggle.annual}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] uppercase font-bold text-white">
                {t.pricing.billingToggle.saveBadge}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => {
            const isPopular = plan.id === "team";
            const displayPrice =
              plan.price === "$49" && billingCycle === "annual" ? "$39" : plan.price;
            const ctaVariant = isPopular ? "primary" : "secondary";

            return (
              <GlassCard
                key={plan.id}
                className={`p-6 sm:p-8 flex flex-col justify-between relative ${
                  isPopular
                    ? "border-[#FF5B26]/50 shadow-[0_0_40px_rgba(249,115,22,0.2),inset_0_1px_0_rgba(255,251,245,0.2)] lg:-translate-y-2"
                    : ""
                }`}
                glow={isPopular ? "primary" : "none"}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-3.5 py-1 rounded-full bg-[#FF5B26] text-white text-[11px] font-mono uppercase tracking-wider font-semibold shadow-[0_0_16px_rgba(249,115,22,0.6)] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {t.pricing.mostPopular}
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold font-display text-[#F5F0E8]">
                      {plan.name}
                    </h3>
                  </div>

                  <p className="text-xs text-[#B7AB9A] min-h-9 mb-6">
                    {plan.tagline}
                  </p>

                  <div className="mb-6 pb-6 border-b border-[rgba(255,251,245,0.08)]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-extrabold font-display text-[#F5F0E8] font-tabular">
                        {displayPrice}
                      </span>
                      <span className="text-xs text-[#B7AB9A] font-mono">
                        {plan.price !== "Custom" && plan.price !== "Liên hệ" ? ` / ${plan.period}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3 mb-8">
                    <div className="text-[11px] font-mono uppercase text-[#6E6457] tracking-wider mb-2">
                      {t.pricing.includedCapabilities}
                    </div>
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#EAE3D6]">
                        <Check className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[rgba(255,251,245,0.08)]">
                  <Button
                    href={plan.id === "enterprise" ? "mailto:enterprise@flae.ai" : "https://app.flae.ai/register"}
                    variant={ctaVariant}
                    size="lg"
                    className="w-full justify-center text-sm font-semibold"
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    {plan.ctaText}
                  </Button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
