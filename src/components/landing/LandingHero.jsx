import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image } from "@/components/ui/image";
import { Mail, ArrowRight, ShieldCheck, Star } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

export default function LandingHero({ heroImage }) {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const phone = settings?.business_phone;

  const submit = (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    navigate(`/portal?email=${encodeURIComponent(trimmed.toLowerCase())}`);
  };

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
            {phone && (
              <Button asChild size="lg" className="gap-2">
                <a href={`tel:${phone}`}>Call {phone}</a>
              </Button>
            )}
            <Button asChild variant="outline" size="lg" className="gap-2">
              <a href="#services">Our Services</a>
            </Button>
          </div>
          <form onSubmit={submit} className="max-w-md space-y-2 rounded-xl border bg-card p-4 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Mail className="h-4 w-4 text-primary" /> View your invoices & estimates
            </label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Your email"
                className="h-11"
              />
              <Button type="submit" className="h-11 shrink-0 gap-1.5">
                Go <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </form>
        </div>
        <div className="relative">
          <div className="overflow-hidden rounded-2xl border shadow-lg">
            <Image src={heroImage} alt="HartServices plumber at work" className="aspect-[4/3] w-full object-cover" fittingType="fill" />
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