"use client";

import dynamic from "next/dynamic";
import HeroSection from "@/components/landing/HeroSection";
import LandingLenis from "@/components/landing/LandingLenis";

// Lazy-load below-the-fold sections for faster initial load
const ProblemSection = dynamic(() => import("@/components/landing/ProblemSection"), { ssr: true });
const HowItWorks = dynamic(() => import("@/components/landing/HowItWorks"), { ssr: true });
const FeaturesGrid = dynamic(() => import("@/components/landing/FeaturesGrid"), { ssr: true });
const SocialProof = dynamic(() => import("@/components/landing/SocialProof"), { ssr: true });
const FinalCTA = dynamic(() => import("@/components/landing/FinalCTA"), { ssr: true });
const LandingFooter = dynamic(() => import("@/components/landing/LandingFooter"), { ssr: true });

// Defer custom cursor so it doesn't compete with hero paint
const CustomCursor = dynamic(
  () => import("@/components/landing/CustomCursor"),
  { ssr: false, loading: () => null }
);

export default function HomePage() {
  return (
    <LandingLenis>
      <CustomCursor />
      <main className="bg-[#1d1d1f]">
        <HeroSection />
        <ProblemSection />
        <HowItWorks />
        <FeaturesGrid />
        <SocialProof />
        <FinalCTA />
        <LandingFooter />
      </main>
    </LandingLenis>
  );
}
