import { Outlet, NavLink, Link } from "react-router-dom";
import { LayoutDashboard, FileText, ClipboardList, Settings, Droplet, Wrench, Users } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/lib/AuthContext";
import { Image } from "@/components/ui/image";

const allNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, roles: ["admin", "tech"] },
  { to: "/jobs", label: "Jobs", icon: Wrench, roles: ["admin", "tech"] },
  { to: "/estimates", label: "Estimates", icon: ClipboardList, roles: ["admin", "tech"] },
  { to: "/invoices", label: "Invoices", icon: FileText, roles: ["admin", "tech"] },
  { to: "/customers", label: "Customers", icon: Users, roles: ["admin"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
  { to: "/portal", label: "My Documents", icon: FileText, roles: ["customer"] },
];

function BrandMark({ settings, size = "md" }) {
  const dim = size === "sm" ? "w-8 h-8" : "w-9 h-9";
  const icon = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  if (settings?.logo_url) {
    return (
      <div className={`${dim} rounded-xl overflow-hidden bg-card border shrink-0`}>
        <Image src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className={`${dim} rounded-xl bg-primary flex items-center justify-center shadow-sm shrink-0`}>
      <Droplet className={`${icon} text-primary-foreground`} />
    </div>
  );
}

export default function Layout() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const brand = settings?.business_name || "FlowPro Plumbing";
  const short = brand.split(" ")[0];
  const nav = allNav.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="hidden md:flex w-64 flex-col border-r bg-card shrink-0">
        <Link to="/" className="h-16 flex items-center gap-2.5 px-6 border-b">
          <BrandMark settings={settings} />
          <span className="font-heading font-semibold text-lg tracking-tight">{short}</span>
        </Link>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t text-xs text-muted-foreground">
          {brand} · Invoicing
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <header className="md:hidden h-14 flex items-center gap-2.5 px-4 border-b bg-card sticky top-0 z-10">
          <BrandMark settings={settings} size="sm" />
          <span className="font-heading font-semibold">{short}</span>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-card border-t flex justify-around px-1 py-1.5">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-medium ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}