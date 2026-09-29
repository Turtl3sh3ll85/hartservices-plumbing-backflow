import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image } from "@/components/ui/image";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { useTheme } from "next-themes";
import { useSettings } from "@/hooks/useSettings";
import { LOGO_LIGHT, LOGO_DARK } from "@/lib/logos";

export default function LandingHeader() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { resolvedTheme } = useTheme();
  const brand = settings?.business_name || "HartServices Plumbing & Backflow";
  const logo = resolvedTheme === "dark" ? LOGO_DARK : LOGO_LIGHT;
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

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
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <a href="#top" className="flex shrink-0 items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-full border bg-card">
            <Image src={settings?.logo_url || logo} alt={brand} className="h-full w-full object-contain" />
          </div>
          <div className="leading-tight">
            <div className="font-heading text-sm font-bold text-foreground">HartServices</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Plumbing & Backflow LLC</div>
          </div>
        </a>
        <form onSubmit={submit} className="hidden items-center gap-2 md:flex">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              type="email"
              placeholder="Enter your E-Mail to view or pay Invoices & Estimates"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Your email"
              className="h-9 w-80 pl-9"
            />
          </div>
          <Button type="submit" size="sm" className="h-9 gap-1.5">
            Go <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          {error && <span className="text-xs text-destructive">{error}</span>}
        </form>
        <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
          <Link to="/login"><Lock className="h-3.5 w-3.5" /> Admin</Link>
        </Button>
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t px-4 py-2 md:hidden">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="email"
            placeholder="Enter your E-Mail to view or pay Invoices & Estimates"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Your email"
            className="h-9 pl-9"
          />
        </div>
        <Button type="submit" size="sm" className="h-9 gap-1.5">
          Go <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </form>
    </header>
  );
}