import { Image } from "@/components/ui/image";
import { useTheme } from "next-themes";
import { useSettings } from "@/hooks/useSettings";
import { LOGO_LIGHT, LOGO_DARK } from "@/lib/logos";

export default function LandingFooter() {
  const { settings } = useSettings();
  const { resolvedTheme } = useTheme();
  const brand = settings?.business_name || "HartServices Plumbing & Backflow";
  const logo = resolvedTheme === "dark" ? LOGO_DARK : LOGO_LIGHT;

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 overflow-hidden rounded-full border bg-card">
            <Image src={settings?.logo_url || logo} alt={brand} className="h-full w-full object-contain" />
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