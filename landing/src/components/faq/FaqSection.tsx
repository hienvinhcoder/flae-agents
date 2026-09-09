"use client";

import React, { useState } from "react";
import { Badge } from "../shared/Badge";
import { useI18n } from "../../i18n/I18nContext";
import { HelpCircle, ChevronDown } from "lucide-react";

export function FaqSection() {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <section id="faq" className="relative py-20 sm:py-28 border-t border-[rgba(255,251,245,0.06)] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <Badge variant="orange" size="md" className="mb-4" icon={<HelpCircle className="w-3.5 h-3.5" />}>
            {t.faq.badge}
          </Badge>
          <h2 className="font-display font-semibold text-2xl sm:text-4xl lg:text-[40px] text-[#F5F0E8] tracking-tight leading-tight">
            {t.faq.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#B7AB9A] leading-relaxed">
            {t.faq.subtitle}
          </p>
        </div>

        {/* Accordion */}
        <div className="max-w-3xl mx-auto space-y-3">
          {t.faq.items.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;
            return (
              <div
                key={item.question}
                className={`rounded-[14px] border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "bg-[rgba(255,251,245,0.06)] border-[#FF5B26]/30 shadow-[0_0_24px_rgba(249,115,22,0.1)]"
                    : "bg-[rgba(255,251,245,0.03)] border-[rgba(255,251,245,0.08)] hover:bg-[rgba(255,251,245,0.05)]"
                }`}
              >
                <button
                  id={buttonId}
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-medium text-[#F5F0E8] font-display">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-[#FB923C] transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="px-5 sm:px-6 pb-5"
                  >
                    <p className="text-sm text-[#B7AB9A] leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
