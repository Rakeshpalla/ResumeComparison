"use client";

import dynamic from "next/dynamic";
import HeroSection from "@/components/landing/HeroSection";
import LandingLenis from "@/components/landing/LandingLenis";

const DemoPreview = dynamic(() => import("@/components/landing/DemoPreview"), { ssr: true });
const HowItWorks = dynamic(() => import("@/components/landing/HowItWorks"), { ssr: true });
const FeaturesGrid = dynamic(() => import("@/components/landing/FeaturesGrid"), { ssr: true });
const PricingSection = dynamic(() => import("@/components/landing/PricingSection"), { ssr: true });
const WhyNotChatGPT = dynamic(() => import("@/components/landing/WhyNotChatGPT"), { ssr: true });
const TestimonialsSection = dynamic(() => import("@/components/landing/TestimonialsSection"), { ssr: true });
const TrustStrip = dynamic(() => import("@/components/landing/TrustStrip"), { ssr: true });
const FinalCTA = dynamic(() => import("@/components/landing/FinalCTA"), { ssr: true });
const LandingFooter = dynamic(() => import("@/components/landing/LandingFooter"), { ssr: true });

export default function HomePage() {
  return (
    <LandingLenis>
      <main className="overflow-x-hidden bg-white">
        <HeroSection />
        <DemoPreview />
        <HowItWorks />
        <FeaturesGrid />
        <PricingSection />
        <WhyNotChatGPT />
        <TestimonialsSection />
        <TrustStrip />
        <FinalCTA />
        <LandingFooter />
      </main>
    </LandingLenis>
  );
}
