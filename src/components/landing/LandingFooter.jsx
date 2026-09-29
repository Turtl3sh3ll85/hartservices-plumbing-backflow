import { Image } from "@/components/ui/image";
import { useSettings } from "@/hooks/useSettings";

const LOGO_URL = "https://base44.app/api/apps/6ab936d39a6c956d5b685842/files/mp/public/6ab936d39a6c956d5b685842/7ae293c6a_Logo.jpg";

export default function LandingFooter() {
  const { settings } = useSettings();
  const brand = settings?.business_name || "HartServices Plumbing & Backflow";

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 overflow-hidden rounded-full border bg-card">
            <Image src={settings?.logo_url || LOGO_URL} alt={brand} className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="font-heading font-bold text-foreground">{brand}</div>
            <div className="text-sm text-muted-foreground">San Antonio, TX · Licensed & Insured</div>
          </div>
          <p className="max-w-md text-xs text-muted-foreground">
            Jon Hart RMP42140 is licensed by the Texas State Board of Plumbing Examiners.
          </p>
        </div>
      </div>
    </footer>
  );
}