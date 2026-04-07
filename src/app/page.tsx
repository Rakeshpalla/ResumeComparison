"use client";

import dynamic from "next/dynamic";
import HeroSection from "@/components/landing/HeroSection";
import LandingLenis from "@/components/landing/LandingLenis";

// Lazy-load below-the-fold sections for faster initial load
const HowItWorks = dynamic(() => import("@/components/landing/HowItWorks"), { ssr: true });
const FeaturesGrid = dynamic(() => import("@/components/landing/FeaturesGrid"), { ssr: true });
const TrustStrip = dynamic(() => import("@/components/landing/TrustStrip"), { ssr: true });
const FinalCTA = dynamic(() => import("@/components/landing/FinalCTA"), { ssr: true });
const LandingFooter = dynamic(() => import("@/components/landing/LandingFooter"), { ssr: true });

export default function HomePage() {
  return (
    <LandingLenis>
      <main className="overflow-x-hidden bg-white">
        <HeroSection />
        <HowItWorks />
        <FeaturesGrid />
        <TrustStrip />
        <FinalCTA />
        <LandingFooter />
      </main>
    </LandingLenis>
  );
}
