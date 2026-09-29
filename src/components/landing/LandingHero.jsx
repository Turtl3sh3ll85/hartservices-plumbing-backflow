import { Button } from "@/components/ui/button";
import { MessageSquare, ShieldCheck, Star } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import HeroCarousel from "@/components/landing/HeroCarousel";

const TEXT_NUMBER = "210-430-0692";

export default function LandingHero() {
  const { settings } = useSettings();

  return (
    <section id="top" className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-2 lg:items-center">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Star className="h-3.5 w-3.5 fill-primary" /> 5.0 Rated · San Antonio, TX
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            San Antonio's Trusted <span className="text-primary">Plumbing & Backflow</span> Experts
          </h1>
          <p className="max-w-md text-muted-foreground">
            Honest, upfront pricing and clean work from a locally owned plumber. From leak repair to backflow testing, water softeners, and tankless water heaters — we keep your home flowing.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <a href={`sms:${TEXT_NUMBER.replace(/-/g, "")}`}><MessageSquare className="h-4 w-4" /> Text {TEXT_NUMBER}</a>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <a href="#services">Our Services</a>
            </Button>
          </div>
        </div>
        <div className="relative">
          <div className="overflow-hidden rounded-2xl border shadow-lg">
            <HeroCarousel />
          </div>
          <div className="absolute -bottom-4 -left-4 hidden items-center gap-2 rounded-xl border bg-card px-4 py-3 shadow-md sm:flex">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div className="text-xs leading-tight">
              <div className="font-semibold text-foreground">Licensed & Insured</div>
              <div className="text-muted-foreground">RMP42140 · TSBPE</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}