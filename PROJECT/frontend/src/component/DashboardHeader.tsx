import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarTrigger } from "@/component/ui/sidebar";
import { Avatar, AvatarFallback } from "@/component/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/component/ui/dropdown-menu";
import {
  LogOut,
  LayoutDashboard, BookOpen, Zap, Users,
  Briefcase, Map, CreditCard, Settings, ChevronRight,
} from "lucide-react";
import { ROUTES } from "@/constants";
import { cn } from "@/lib/utils";

/* ── Route → breadcrumb meta ──────────────────────────────────────────────── */

const ROUTE_META: Record<string, { label: string; icon: React.ElementType; parent?: string }> = {
  [ROUTES.DASHBOARD]:     { label: "Dashboard",     icon: LayoutDashboard },
  [ROUTES.COURSES]:       { label: "Courses",        icon: BookOpen,  parent: "Learning" },
  [ROUTES.SKILLS]:        { label: "Skills",         icon: Zap,       parent: "Learning" },
  [ROUTES.ROADMAPS]:      { label: "Roadmaps",       icon: Map,       parent: "Learning" },
  [ROUTES.USERS]:         { label: "Users",          icon: Users,     parent: "Management" },
  [ROUTES.JOB_ROLES]:     { label: "Job Roles",      icon: Briefcase, parent: "Management" },
  [ROUTES.SUBSCRIPTIONS]: { label: "Subscriptions",  icon: CreditCard,parent: "Management" },
  [ROUTES.SETTINGS]:      { label: "Settings",       icon: Settings,  parent: "System" },
};

function useBreadcrumb() {
  const { pathname } = useLocation();
  // exact match first, then prefix match
  let meta = ROUTE_META[pathname];
  if (!meta) {
    const match = Object.entries(ROUTE_META).find(([url]) =>
      url !== ROUTES.DASHBOARD && pathname.startsWith(url + "/")
    );
    if (match) meta = match[1];
  }
  return meta ?? { label: "Overview", icon: LayoutDashboard, parent: undefined };
}

/* ── Component ────────────────────────────────────────────────────────────── */

export function DashboardHeader() {
  const navigate  = useNavigate();
  const { logout } = useAuth();
  const crumb     = useBreadcrumb();
  const Icon      = crumb.icon;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-14 flex items-center justify-between px-4",
        "border-b backdrop-blur-xl",
      )}
      style={{
        borderColor: "hsl(var(--border)/0.5)",
        background: "hsl(var(--background)/0.80)",
      }}
    >
      {/* Top shimmer line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

      {/* ── Left: trigger + breadcrumb ── */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />

        {/* Separator */}
        <div className="h-4 w-px bg-border/60" />

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          {crumb.parent && (
            <>
              <span className="text-muted-foreground/60 font-medium">{crumb.parent}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            </>
          )}
          <div className="flex items-center gap-1.5">
            <span
              className="flex items-center justify-center w-5 h-5 rounded-md"
              style={{ background: "hsl(var(--primary)/0.12)" }}
            >
              <Icon className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
            </span>
            <span className="font-semibold text-foreground">{crumb.label}</span>
          </div>
        </div>
      </div>

      {/* ── Right: status pill + avatar ── */}
      <div className="flex items-center gap-3">
        {/* Online status pill */}
        <div
          className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 border text-xs font-medium"
          style={{
            background: "hsl(var(--primary)/0.08)",
            borderColor: "hsl(var(--primary)/0.20)",
            color: "hsl(var(--primary))",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: "hsl(var(--primary))" }}
          />
          Admin
        </div>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative outline-none group">
              {/* Glow ring on hover */}
              <span
                className="absolute -inset-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "hsl(var(--primary)/0.25)", filter: "blur(6px)" }}
              />
              <Avatar className="relative h-8 w-8 ring-2 transition-all duration-200 group-hover:ring-primary/50"
                style={{ "--tw-ring-color": "hsl(var(--primary)/0.20)" } as React.CSSProperties}
              >
                <AvatarFallback
                  className="text-xs font-semibold"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)/0.8) 0%, hsl(var(--primary)) 100%)",
                    color: "hsl(var(--primary-foreground))",
                  }}
                >
                  AD
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 animate-scale-in glass-strong"
            style={{ border: "1px solid hsl(var(--border)/0.5)" }}
          >
            {/* Admin info */}
            <div className="px-3 py-3 border-b" style={{ borderColor: "hsl(var(--border)/0.5)" }}>
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback
                    className="text-xs font-semibold"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary)/0.8) 0%, hsl(var(--primary)) 100%)",
                      color: "hsl(var(--primary-foreground))",
                    }}
                  >
                    AD
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">Admin</p>
                  <p className="text-xs text-muted-foreground truncate">admin@nexapath.com</p>
                </div>
              </div>
            </div>

            <DropdownMenuSeparator className="opacity-0 my-0.5" />

            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/8 cursor-pointer gap-2 mx-1 mb-1 rounded-md"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="text-sm">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
