import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image } from "@/components/ui/image";
import { useSettings } from "@/hooks/useSettings";
import { Mail, ArrowRight, Loader2, Lock } from "lucide-react";

const LOGO_URL = "https://base44.app/api/apps/6ab936d39a6c956d5b685842/files/mp/public/6ab936d39a6c956d5b685842/7ae293c6a_Logo.jpg";

export default function LandingPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
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

  const brand = settings?.business_name || "HartServices Plumbing & Backflow";

  return (
    <div className="min-h-screen flex flex-col bg-muted/30 relative">
      <div className="absolute top-0 right-0 p-4 sm:p-6 z-10">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/login"><Lock className="w-3.5 h-3.5" /> Admin Login</Link>
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-card border shadow-sm mx-auto mb-6">
            <Image src={settings?.logo_url || LOGO_URL} alt={brand} className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
            {brand}
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Enter the email on file to view your invoices, estimates, and service requests.
          </p>

          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                type="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                aria-label="Your email"
              />
            </div>
            {error && <p className="text-sm text-destructive text-left">{error}</p>}
            <Button type="submit" className="w-full h-12 font-medium">
              View my documents <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground px-4 pb-6">
        Jon Hart RMP42140. is Licensed by the Texas State Board of Plumbing Examiners
      </p>
    </div>
  );
}