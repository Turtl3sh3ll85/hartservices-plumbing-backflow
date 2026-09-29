import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import LandingServices from "@/components/landing/LandingServices";
import LandingPromotions from "@/components/landing/LandingPromotions";
import LandingWork from "@/components/landing/LandingWork";
import LandingReviews from "@/components/landing/LandingReviews";
import LandingFooter from "@/components/landing/LandingFooter";

const HERO_IMAGE = "https://media.base44.com/images/public/6ab936d39a6c956d5b685842/a4305cf45_generated_image.png";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <LandingHero heroImage={HERO_IMAGE} />
      <LandingServices />
      <LandingPromotions />
      <LandingWork />
      <LandingReviews />
      <LandingFooter />
    </div>
  );
}