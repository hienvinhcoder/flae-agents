import React from "react";
import { FloatingNavbar } from "../components/layout/FloatingNavbar";
import { HeroSection } from "../components/hero/HeroSection";
import { ContextTimelineSection } from "../components/timeline/ContextTimelineSection";
import { ThreeDifferentiatorsSection } from "../components/differentiators/ThreeDifferentiatorsSection";
import { SearchVsContextSection } from "../components/comparison/SearchVsContextSection";
import { AgentMemoryLayerSection } from "../components/agents/AgentMemoryLayerSection";
import { UseCasesSection } from "../components/usecases/UseCasesSection";
import { HowItWorks } from "../components/howitworks/HowItWorks";
import { IntegrationsGrid } from "../components/integrations/IntegrationsGrid";
import { EnterpriseSecurity } from "../components/architecture/EnterpriseSecurity";
import { PricingSection } from "../components/pricing/PricingSection";
import { FaqSection } from "../components/faq/FaqSection";
import { Footer } from "../components/layout/Footer";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-[#140F0B] text-[#F5F0E8] selection:bg-[#FF5B26]/30 selection:text-white">
      {/* Floating Navigation Pill */}
      <FloatingNavbar />

      {/* 1. Hero — 40/60 Layout with Real Stale Doc Demo */}
      <HeroSection />

      {/* 2. Section: "FLAE connects what happened, not just where it was written" */}
      <ContextTimelineSection />

      {/* 3. Three Differentiators (Relationships, Time/Change, Evidence) */}
      <ThreeDifferentiatorsSection />

      {/* 4. Technology: Search vs Context Reconstruction (Bidirectional Text-Graph) */}
      <SearchVsContextSection />

      {/* 5. AI Infrastructure: One memory layer. Every AI agent. (MCP Architecture) */}
      <AgentMemoryLayerSection />

      {/* 6. Real Questions / Multi-source Use Cases */}
      <UseCasesSection />

      {/* 7. How It Works — 3 Simple Steps */}
      <HowItWorks />

      {/* 8. Workplace Connectors */}
      <IntegrationsGrid />

      {/* 9. Enterprise Security & Architecture */}
      <EnterpriseSecurity />

      {/* 10. Pricing */}
      <PricingSection />

      {/* 11. FAQ */}
      <FaqSection />

      {/* 12. Footer & Final CTA ("Give your AI the context it's missing") */}
      <Footer />
    </main>
  );
}
