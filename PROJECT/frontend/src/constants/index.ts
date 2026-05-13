// ─── Auth ──────────────────────────────────────────────────────────────────────
export const ADMIN_EMAIL    = "admin@nexapath.com";
export const ADMIN_PASSWORD = "issproject";
export const AUTH_KEY       = "admin_auth";
export const THEME_KEY      = "nexapath_theme";
export const SETTINGS_KEY   = "nexapath_settings";
export const LOCKOUT_KEY    = "admin_lockout";
export const ATTEMPTS_KEY   = "admin_attempts";
export const MAX_LOGIN_ATTEMPTS = 3;
export const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// ─── App ───────────────────────────────────────────────────────────────────────
export const APP_NAME       = "NexaPath";
export const SUPPORT_EMAIL  = "support@nexapath.com";

// ─── Routes ────────────────────────────────────────────────────────────────────
export const ROUTES = {
  LOGIN:               "/login",
  DASHBOARD:           "/",
  COURSES:             "/courses",
  SKILLS:              "/skills",
  USERS:               "/users",
  JOB_ROLES:           "/job-roles",
  ROADMAPS:            "/roadmaps",
  COMMUNITY:           "/community",
  SUBSCRIPTIONS:       "/subscriptions",
  AI_CHAT:             "/ai-chat",
  AI_ROADMAP:          "/ai-roadmap",
  SETTINGS:            "/settings",
} as const;
