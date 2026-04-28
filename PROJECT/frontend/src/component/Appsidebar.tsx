import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, Zap, Users,
  Briefcase, Map, CreditCard, Settings,
  ChevronLeft, ChevronRight, MessageSquareText, Wand2,
} from "lucide-react";
import { useSidebar } from "@/component/ui/sidebar";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants";

/* ── Navigation structure ─────────────────────────────────────────────────── */

const sections = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: ROUTES.DASHBOARD, icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: "Learning",
    items: [
      { title: "Courses",   url: ROUTES.COURSES,   icon: BookOpen },
      { title: "Skills",    url: ROUTES.SKILLS,    icon: Zap },
      { title: "Roadmaps",  url: ROUTES.ROADMAPS,  icon: Map },
    ],
  },
  {
    label: "AI",
    items: [
      { title: "AI Chat",     url: ROUTES.AI_CHAT,    icon: MessageSquareText },
      { title: "AI Roadmap",  url: ROUTES.AI_ROADMAP, icon: Wand2 },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Users",         url: ROUTES.USERS,         icon: Users },
      { title: "Job Roles",     url: ROUTES.JOB_ROLES,     icon: Briefcase },
      { title: "Subscriptions", url: ROUTES.SUBSCRIPTIONS, icon: CreditCard },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings", url: ROUTES.SETTINGS, icon: Settings },
    ],
  },
];

/* ── Component ────────────────────────────────────────────────────────────── */

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location  = useLocation();

  function isActive(url: string, end?: boolean) {
    if (end) return location.pathname === url;
    return location.pathname === url || location.pathname.startsWith(url + "/");
  }

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full flex-shrink-0 border-r border-sidebar-border overflow-hidden",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[64px]" : "w-[240px]",
      )}
      style={{ background: "linear-gradient(180deg, hsl(222 30% 7%) 0%, hsl(222 28% 6%) 100%)" }}
    >
      {/* ── Background grid texture ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* ── Ambient glow top-left ── */}
      <div
        className="pointer-events-none absolute -top-20 -left-20 w-48 h-48 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, hsl(152 65% 40%) 0%, transparent 70%)" }}
      />

      {/* ── Logo row ── */}
      <div className={cn(
        "relative z-10 flex items-center border-b border-sidebar-border",
        collapsed ? "justify-center px-0 py-5" : "gap-3 px-5 py-5",
      )}>
        {/* Logo orb */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-xl bg-primary/40 blur-md scale-110 animate-pulse" style={{ animationDuration: "3s" }} />
          <img
            src="/logo.png"
            alt="NexaPath"
            className="relative w-8 h-8 rounded-xl object-cover ring-1 ring-white/10 shadow-lg"
          />
        </div>

        {/* Brand name */}
        <div className={cn(
          "overflow-hidden transition-all duration-300",
          collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
        )}>
          <span className="text-[15px] font-semibold text-white tracking-tight whitespace-nowrap">
            NexaPath
          </span>
          <span className="block text-[10px] text-sidebar-muted tracking-widest uppercase whitespace-nowrap" style={{ color: "hsl(var(--sidebar-muted))" }}>
            Admin Panel
          </span>
        </div>
      </div>

      {/* ── Nav sections ── */}
      <nav className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {sections.map((section, si) => (
          <div key={section.label} className={si > 0 ? "mt-2" : ""}>
            {/* Section label */}
            {!collapsed && (
              <p className="nav-label">{section.label}</p>
            )}
            {collapsed && si > 0 && (
              <div className="mx-3 my-2 h-px" style={{ background: "hsl(var(--sidebar-border))" }} />
            )}

            {/* Items */}
            {section.items.map((item, idx) => {
              const active = isActive(item.url, (item as any).end);
              return (
                <Link
                  key={item.url}
                  to={item.url}
                  title={collapsed ? item.title : undefined}
                  className={cn("nav-item animate-slide-left", active && "active")}
                  style={{ animationDelay: `${(si * 3 + idx) * 40}ms` }}
                >
                  {/* Active indicator bar */}
                  <span className="nav-item-indicator" />

                  {/* Icon */}
                  <item.icon
                    className={cn(
                      "nav-icon flex-shrink-0 transition-transform duration-200",
                      collapsed ? "w-4.5 h-4.5" : "w-4 h-4",
                      active ? "text-primary" : "text-sidebar-foreground/60",
                    )}
                    style={{ width: collapsed ? 18 : 16, height: collapsed ? 18 : 16 }}
                  />

                  {/* Label */}
                  <span className={cn(
                    "transition-all duration-300 overflow-hidden",
                    collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
                  )}>
                    {item.title}
                  </span>

                  {/* Active dot (collapsed mode) */}
                  {collapsed && active && (
                    <span
                      className="absolute right-1.5 top-1.5 w-1.5 h-1.5 rounded-full"
                      style={{ background: "hsl(var(--sidebar-primary))", boxShadow: "0 0 6px hsl(var(--sidebar-primary))" }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Bottom: version + collapse toggle ── */}
      <div
        className="relative z-10 border-t px-3 py-3 space-y-1"
        style={{ borderColor: "hsl(var(--sidebar-border))" }}
      >
        {!collapsed && (
          <div className="px-2 pb-1">
            <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: "hsl(var(--sidebar-muted))" }}>
              NexaPath · v1.0
            </p>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "nav-item w-full group",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed && (
            <span className="text-[13px]" style={{ color: "hsl(var(--sidebar-muted))" }}>
              Collapse
            </span>
          )}
          <span className={cn(
            "flex items-center justify-center w-5 h-5 rounded-md transition-colors",
            "group-hover:bg-white/10",
          )}>
            {collapsed
              ? <ChevronRight className="w-3.5 h-3.5" style={{ color: "hsl(var(--sidebar-muted))" }} />
              : <ChevronLeft  className="w-3.5 h-3.5" style={{ color: "hsl(var(--sidebar-muted))" }} />
            }
          </span>
        </button>
      </div>
    </aside>
  );
}
