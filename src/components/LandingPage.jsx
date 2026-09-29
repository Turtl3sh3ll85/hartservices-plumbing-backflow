import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import LandingServices from "@/components/landing/LandingServices";
import LandingPromotions from "@/components/landing/LandingPromotions";
import LandingWork from "@/components/landing/LandingWork";
import LandingReviews from "@/components/landing/LandingReviews";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <LandingHero />
      <LandingServices />
      <LandingPromotions />
      <LandingWork />
      <LandingReviews />
      <LandingFooter />
    </div>
  );
}