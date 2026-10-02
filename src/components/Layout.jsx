import { useEffect, useRef } from "react";
import { Outlet, NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { LayoutDashboard, FileText, ClipboardList, Settings, Droplet, UserCog, ArrowLeft, LogOut, ArrowLeftRight, Camera, BarChart3 } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import PullToRefresh from "@/components/PullToRefresh";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useState } from "react";
import { useTheme } from "next-themes";

const PRIMARY_MOBILE_TABS = new Set(["/estimates", "/invoices", "/receipts"]);

const allNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, roles: ["admin", "tech", "accountant"] },
  { to: "/estimates", label: "Estimates", icon: ClipboardList, roles: ["admin", "tech", "accountant"] },
  { to: "/invoices", label: "Invoices", icon: FileText, roles: ["admin", "tech", "accountant"] },
  { to: "/customers", label: "Customers", icon: UserCog, roles: ["admin"] },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight, roles: ["admin", "accountant"] },
  { to: "/reports", label: "Expense Graph", icon: BarChart3, roles: ["admin", "accountant"] },
  { to: "/receipts", label: "Receipt Scan", icon: Camera, roles: ["admin", "accountant"] },
  { to: "/users", label: "Users", icon: UserCog, roles: ["admin"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

function BrandMark({ settings, size = "md" }) {
  const dim = size === "sm" ? "w-8 h-8" : "w-9 h-9";
  const icon = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const { theme } = useTheme();
  const isDark = (theme === "dark" || (!theme && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches));
  const logoUrl = (isDark && settings?.dark_logo_url) ? settings.dark_logo_url : (settings?.logo_url || "https://base44.app/api/apps/6ab936d39a6c956d5b685842/files/mp/public/6ab936d39a6c956d5b685842/7ae293c6a_Logo.jpg");
  return (
    <div className={`${dim} rounded-xl overflow-hidden bg-card border shrink-0`}>
      <Image src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
    </div>
  );
}

export default function Layout() {
  const { settings } = useSettings();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const brand = settings?.business_name || "";
  const short = brand ? brand.split(" ")[0] : "";
  const nav = allNav.filter((item) => item.roles.includes(user?.role));
  const mobilePrimary = nav.filter((item) => PRIMARY_MOBILE_TABS.has(item.to));
  const mobileMore = nav.filter((item) => !PRIMARY_MOBILE_TABS.has(item.to));
  const [moreOpen, setMoreOpen] = useState(false);
  const TAB_ROUTES_KEY = "proinvoice_tabRoutes";
  const tabRoutes = useRef({});
  const pendingRestore = useRef(null);
  const activeItem = nav.find((i) => i.end ? location.pathname === i.to : location.pathname === i.to || location.pathname.startsWith(i.to + "/"));
  const isChildRoute = !activeItem || location.pathname !== activeItem.to;

  const persist = () => {
    try { sessionStorage.setItem(TAB_ROUTES_KEY, JSON.stringify(tabRoutes.current)); } catch (e) {}
  };

  const buildHierarchy = (tabRoot, currentPath) => {
    if (currentPath === tabRoot) return [{ path: tabRoot, scroll: 0 }];
    const segments = currentPath.split("/").filter(Boolean);
    const rootDepth = tabRoot.split("/").filter(Boolean).length;
    const hierarchy = [tabRoot];
    for (let i = rootDepth + 1; i <= segments.length; i++) {
      hierarchy.push("/" + segments.slice(0, i).join("/"));
    }
    return hierarchy.map((p) => ({ path: p, scroll: 0 }));
  };

  // mount: deserialize from sessionStorage, then seed deep-link hierarchy
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(TAB_ROUTES_KEY);
      if (raw) tabRoutes.current = JSON.parse(raw);
    } catch (e) {}
    if (activeItem) {
      const stack = tabRoutes.current[activeItem.to] || [];
      const hasCurrent = stack.some((e) => e && e.path === location.pathname);
      if (!hasCurrent) {
        tabRoutes.current[activeItem.to] = buildHierarchy(activeItem.to, location.pathname);
      }
    }
    persist();
    return () => persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // track the current path at the top of the active tab's stack
  useEffect(() => {
    if (activeItem) {
      const stack = tabRoutes.current[activeItem.to] || [];
      const existingIdx = stack.findIndex((e) => e && e.path === location.pathname);
      if (existingIdx >= 0) {
        if (existingIdx !== stack.length - 1) {
          tabRoutes.current[activeItem.to] = stack.slice(0, existingIdx + 1);
          persist();
        }
      } else {
        const top = stack[stack.length - 1];
        if (!top || top.path !== location.pathname) {
          tabRoutes.current[activeItem.to] = [...stack, { path: location.pathname, scroll: 0 }];
          persist();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // record scroll position for the current top-of-stack path
  useEffect(() => {
    const onScroll = () => {
      if (!activeItem) return;
      const stack = tabRoutes.current[activeItem.to];
      if (!stack || !stack.length) return;
      const top = stack[stack.length - 1];
      if (top && top.path === location.pathname) top.scroll = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem, location.pathname]);

  // restore scroll position after switching back to a previously visited tab
  useEffect(() => {
    if (pendingRestore.current && pendingRestore.current.path === location.pathname) {
      const y = pendingRestore.current.scroll || 0;
      pendingRestore.current = null;
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="hidden md:flex w-64 flex-col border-r bg-card shrink-0 select-none">
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
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors select-none ${
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

      <div className="flex-1 flex flex-col min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <header
          className="min-h-14 flex items-center gap-2.5 px-4 border-b bg-card sticky top-0 z-10"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {isChildRoute ? (
            <button
              onClick={() => navigate(-1)}
              className="md:hidden flex items-center gap-1.5 -ml-1 px-1 min-h-11 min-w-11 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              onClick={() => setMoreOpen(true)}
              className="md:hidden flex items-center gap-2.5 min-w-0 min-h-11 -ml-1 px-1 rounded-lg hover:bg-accent transition-colors"
              aria-label="Open menu"
            >
              <BrandMark settings={settings} size="sm" />
              <span className="font-heading font-semibold shrink-0">{short}</span>
              {activeItem && (
                <>
                  <span className="text-muted-foreground/40 shrink-0">/</span>
                  <span className="text-sm font-medium text-muted-foreground truncate min-w-0">{activeItem.label}</span>
                </>
              )}
            </button>
          )}
          <div className="hidden md:flex items-center gap-3 ml-1 min-w-0">
            {activeItem && (
              <span className="text-sm font-medium text-muted-foreground truncate">{activeItem.label}</span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {user?.email && (
              <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[200px]">{user.email}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="text-muted-foreground hover:text-destructive gap-1.5"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overscroll-none">
          <PullToRefresh onRefresh={async () => { await queryClient.invalidateQueries(); }}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </PullToRefresh>
        </main>
      </div>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t flex justify-around px-1 py-1.5 select-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {mobilePrimary.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={(e) => {
              const isActive = Boolean(activeItem && activeItem.to === item.to);
              if (isActive) {
                e.preventDefault();
                tabRoutes.current[item.to] = [{ path: item.to, scroll: 0 }];
                pendingRestore.current = null;
                persist();
                navigate(item.to, { replace: true, state: { t: Date.now() } });
              } else {
                const stack = tabRoutes.current[item.to];
                const top = stack && stack.length ? stack[stack.length - 1] : null;
                const topPath = top ? top.path : item.to;
                if (topPath !== item.to) {
                  e.preventDefault();
                  pendingRestore.current = { path: topPath, scroll: (top && top.scroll) || 0 };
                  navigate(topPath);
                }
              }
            }}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 min-h-11 sm:min-h-0 rounded-lg text-xs font-medium select-none ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Menu</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-2 pb-6">
            {mobileMore.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-md px-3 min-h-11 py-2.5 text-sm text-left transition-colors ${
                    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
                  }`
                }
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => { setMoreOpen(false); logout(); }}
              className="flex w-full items-center gap-3 rounded-md px-3 min-h-11 py-2.5 text-sm text-left text-muted-foreground hover:bg-accent transition-colors"
            >
              <LogOut className="w-[18px] h-[18px]" />
              Log out
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}