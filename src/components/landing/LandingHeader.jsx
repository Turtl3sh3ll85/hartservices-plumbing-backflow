import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { Lock, Phone } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

const LOGO_URL = "https://base44.app/api/apps/6ab936d39a6c956d5b685842/files/mp/public/6ab936d39a6c956d5b685842/7ae293c6a_Logo.jpg";

export default function LandingHeader() {
  const { settings } = useSettings();
  const brand = settings?.business_name || "HartServices Plumbing & Backflow";
  const phone = settings?.business_phone;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="#top" className="flex items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-full border bg-card">
            <Image src={settings?.logo_url || LOGO_URL} alt={brand} className="h-full w-full object-contain" />
          </div>
          <div className="leading-tight">
            <div className="font-heading text-sm font-bold text-foreground">HartServices</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Plumbing & Backflow LLC</div>
          </div>
        </a>
        <div className="flex items-center gap-2">
          {phone && (
            <a href={`tel:${phone}`} className="hidden items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary sm:flex">
              <Phone className="h-4 w-4" /> {phone}
            </a>
          )}
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/login"><Lock className="h-3.5 w-3.5" /> Admin</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}