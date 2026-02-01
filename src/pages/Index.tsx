import React from "react";
import Header from "@/components/Header";
import LandingHero from "@/components/landing/LandingHero";
import ProblemSolution from "@/components/landing/ProblemSolution";
import KeyFeatures from "@/components/landing/KeyFeatures";
import UseCases from "@/components/landing/UseCases";
import Benefits from "@/components/landing/Benefits";
import HowItWorks from "@/components/landing/HowItWorks";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";
import LanguagePrompt from "@/components/LanguagePrompt";

const Index = () => {
  return (
    <div className="min-h-screen bg-empresarial">
      <Header showLandingNav={true} />
      
      <LandingHero />
      <ProblemSolution />
      <KeyFeatures />
      <UseCases />
      <Benefits />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      
      <LandingFooter />
      
      {/* Language detection prompt for English browsers */}
      <LanguagePrompt />
    </div>
  );
};

export default Index;
