# NexaPath — System Architecture

A line-by-line tour of every subsystem in the repository: what it is, how it
fits together, and the core functions you need to know about. Use this as the
primary onboarding document for anyone joining the project.

```
PROJECT
├── frontend/        Web admin dashboard (React + Vite, TypeScript)
├── backend/         Node.js + Express API gateway
├── mobile/          Expo (React Native) mobile app
└── ai/              Python + FastAPI AI service (Ollama-backed LLM)
```

The four subsystems talk to **one shared Supabase Postgres database**.

```
              ┌────────────┐     ┌────────────┐
              │  frontend  │     │   mobile   │
              │ (web/admin)│     │ (Expo app) │
              └─────┬──────┘     └─────┬──────┘
                    │  REST            │  REST + direct Supabase REST
                    ▼                  ▼
              ┌──────────────────────────────────┐
              │   backend  (Express on :5000)    │
              │   • auth / users / profiles       │
              │   • job aggregation               │
              │   • proxy to AI service           │
              └─────┬─────────────────────┬───────┘
                    │ HTTP                │ direct
                    ▼                     ▼
              ┌──────────────┐     ┌──────────────┐
              │    ai (FastAPI│     │   Supabase   │
              │   on :8000)   │     │   Postgres   │
              │   • LLM chat  │     │              │
              │   • roadmaps  │     │              │
              │   • skill gap │     │              │
              │   • job search│     │              │
              └──────┬───────┘     └──────────────┘
                     │
                     ▼
              ┌──────────────┐
              │   Ollama     │
              │  (qwen 2.5)  │
              │  localhost   │
              └──────────────┘
```

---

## 1. Backend — Express API gateway

**Path:** `PROJECT/backend/`
**Runs at:** `http://localhost:5000`
**Stack:** Node.js · Express 4 · Supabase JS · `pg` · `node-cron` · Redis (ioredis) · Helmet · Morgan

### What it is
The HTTP edge of the system. It owns authentication, user-facing CRUD, and
acts as a thin proxy that authenticates incoming mobile/web requests and
forwards them to either Supabase or the Python AI service. It also runs the
background job aggregation cron.

### Folder layout
```
backend/
├── src/
│   ├── app.js               Express bootstrap (middleware + route mounts)
│   ├── server.js            Lifecycle + graceful shutdown + cron registration
│   ├── config/database.js   Supabase client factory + connection test
│   ├── routes/              Per-resource Express routers
│   ├── controllers/         HTTP handlers (one per resource)
│   ├── models/              Thin DB helpers (mostly raw pg)
│   ├── services/            Cross-cutting services (cache, ollama, trending…)
│   ├── scrapers/            Live job-board scrapers (LinkedIn/Bayt/Keejob)
│   ├── jobs/                node-cron worker definitions
│   ├── middlewares/         userAuth, etc.
│   └── utils/               logger, helpers
├── database/                schema.sql + migrations
└── scripts/
    ├── dev-start.js         Launches backend + AI + Ollama with status panel
    └── seed-remotive.js     Pulls Remotive jobs into normalized_jobs
```

### Bootstrap flow
1. `server.js` loads `app.js`, connects Redis cache, registers the cron worker,
   and listens on `$PORT` (default `5000`).
2. `app.js` mounts Helmet, CORS, rate-limiting (`globalLimiter`,
   `authLimiter`), Morgan logger, body parsers.
3. Every `app.use('/api/...', router)` line maps a resource to its router.
4. SIGTERM/SIGINT trigger a graceful shutdown (`server.close` + cache disconnect).

### Routes (`/api/...`)

| Path                  | Router file                  | Purpose                                       |
| --------------------- | ---------------------------- | --------------------------------------------- |
| `/api/auth`           | `authRoutes.js`              | register, login, refresh-token, me, logout    |
| `/api/users`          | `userroutes.js`              | admin CRUD over users                         |
| `/api/user/profile`   | `userProfileRoutes.js`       | get/update the signed-in user's profile       |
| `/api/user/skills`    | `userSkillsRoutes.js`        | user skill CRUD                               |
| `/api/user/ai`        | `userAiRoutes.js`            | chat history, send chat, jobs/search, jobs/trending, roadmap, complete |
| `/api/user/home`      | `userHomeRoutes.js`          | personalised home payload (roadmap, jobs)     |
| `/api/categories`     | `categoryRoutes.js`          | category taxonomy                             |
| `/api/skills`         | `skillRoutes.js`             | skill catalog + trending                      |
| `/api/courses`        | `courseRoutes.js`            | course CRUD + search                          |
| `/api/job-roles`      | `jobRoleRoutes.js`           | job role taxonomy                             |
| `/api/roadmaps`       | `roadmaproutes.js`           | roadmap CRUD + step status                    |
| `/api/progress`       | `progressRoutes.js`          | course progress per profile                   |
| `/api/chat`           | `chatRoutes.js`              | raw chat-session CRUD                         |
| `/api/notifications`  | `notificationRoutes.js`      | per-profile notifications                     |
| `/api/plans`          | `planroutes.js`              | subscription plans                            |
| `/api/subscriptions`  | `subscriptionRoutes.js`      | user subscriptions                            |
| `/api/market-trends`  | `jobMarketTrendRoutes.js`    | job market trend rows                         |
| `/api/admin`          | `adminroutes.js`             | admin login + stats                           |
| `/api/community`      | `communityRoutes.js`         | shared community roadmap feed                 |
| `/api/qwen`           | `qwen.js`                    | direct Qwen API proxy (chat, score, roadmap)  |
| `/api/v1` (jobs)      | `jobs.routes.js`             | aggregated normalized jobs                    |

### Core controllers worth knowing

- **`authController.js`** — `register` / `login` / `refreshToken` / `getMe` / `logout`. Uses Supabase Auth (`supabaseAdmin.auth.admin.createUser`) + mirrors `full_name` into the `profiles` table.
- **`userProfileController.js`** — `getUserProfile` (auto-creates a profiles row for new users), `upsertUserProfile` (writes `full_name`, `domain`, `title`, `experience_level`, `bio`; mirrors display name into `auth.users.user_metadata`).
- **`userAiController.js`** — proxy to the Python AI service (`/ai/chat`, `/api/jobs/search`, `/api/jobs/trending`, `/ai/generate-roadmap`). Persists user/assistant messages into `chat_sessions` / `chat_messages` along the way.
- **`userHomeController.js`** — composes the personalised home payload (roadmap snapshot, trending jobs, suggested next step).
- **`jobs.controller.js`** — public `/api/v1/jobs` and `/api/v1/trending`. Reads from `normalized_jobs`, with Redis cache (15 min) and a fallback that calls the AI service's `/api/jobs/search` if cache miss.
- **`qwenController.js`** — direct proxy to Alibaba DashScope's OpenAI-compatible Qwen API (`chat`, `score`, `generateRoadmap`, `status`). Mock mode kicks in when `QWEN_API_KEY` is missing.
- **`communityController.js`** — `getShares` returns the shared-roadmap feed (same shape mobile reads) for the web Community page.

### Background jobs

- `jobs/aggregator.cron.js` — runs on a fixed cadence: invokes the configured scrapers, normalises results into `normalized_jobs`, recomputes a `trending_snapshots` row per region. Started from `server.js`.
- `scripts/seed-remotive.js` — one-shot CLI that pulls up to N Remotive postings across 12 categories and upserts them through Supabase REST (`raw_jobs` → `normalized_jobs`). Re-runnable; rows are dedup'd by `source_url`.

### Cache

`services/cache.service.js` wraps `ioredis`. Used by the jobs controller and a few other read-heavy endpoints (`jobs:*`, `job:*`). Falls back to a no-op cache when Redis isn't reachable so the API stays up.

### Database access

Two modes coexist:
- **Supabase REST via `supabaseAdmin`** (the modern path) — used by anything that needs RLS or Supabase Auth (`auth.users` lives outside the public schema).
- **Raw `pg.Pool` against `DATABASE_URL`** (the legacy path) — used by `models/` and the job-aggregation pipeline that needs SQL-only features (`UNNEST`, `deduplicate_normalized_jobs()`, etc.).

---

## 2. AI — FastAPI service

**Path:** `PROJECT/ai/`
**Runs at:** `http://localhost:8000`
**Stack:** Python 3.11+ · FastAPI · uvicorn · httpx · asyncpg · psycopg2 · BeautifulSoup · pandas · matplotlib

### What it is
A Python microservice that hosts all LLM-touching endpoints. The backend
forwards `/api/user/ai/*` calls here. It talks to a **local Ollama server**
(default `http://localhost:11434/v1`) running `qwen2.5:7b` / `qwen2.5:14b` /
`qwen2:7b` — configurable via `OLLAMA_MODEL_CHAT`.

### Folder layout
```
ai/
├── backend.py                FastAPI app factory + lifespan + auth middleware
├── ai_chat_*.py              Career-roadmap chat (router/service/prompt/llm)
├── ai_profile_extract_*.py   Background extraction of structured profile data
├── ai_roadmap_*.py           Roadmap generation endpoint (one-shot)
├── ai_skill_gap_*.py         Skill-gap analysis endpoint
├── ai_job_search.py          Live job search across Remotive + Arbeitnow
├── scraper.py                BLS Occupational Outlook scraper
├── trend_worker.py           Standalone CLI for periodic skill-trend mining
├── services/llm_service.py   Shared LLM helpers (build_messages, call_llm, list_models)
├── tools.py                  Misc shared utilities
└── requirements.txt
```

### Endpoint map (mounted on FastAPI)

| Path                          | Module                         | Purpose                                       |
| ----------------------------- | ------------------------------ | --------------------------------------------- |
| `POST /ai/chat`               | `ai_chat_*`                    | Guided career questionnaire (one turn)        |
| `POST /ai/extract-profile`    | `ai_profile_extract_*`         | Pull structured skills/goals from free text   |
| `POST /ai/generate-roadmap`   | `ai_roadmap_*`                 | Generate a structured learning roadmap        |
| `POST /ai/skill-gap-analysis` | `ai_skill_gap_*`               | Compare current skills against a target role  |
| `GET  /api/jobs/search`       | `ai_job_search.py`             | Live search across job boards + filter        |
| `GET  /api/jobs/trending`     | `ai_job_search.py`             | Curated trending IT roles                     |

### Auth model
- `AI_REQUIRE_AUTH=true` (production) → every request must carry
  `x-ai-service-token: $AI_SERVICE_TOKEN` (set in `.env`).
- `AI_REQUIRE_AUTH=false` (dev) → permissive CORS allowlist for localhost.

### How the chat (questionnaire) flow works

1. **Mobile** calls `POST /api/user/ai/chat` → **backend** auths, persists the user message into `chat_messages`, then forwards to **AI** `POST /ai/chat`.
2. **`ai_chat_service.handle_chat`** loads the last N messages (`fetch_recent_messages`) and the user's stored AI profile from Postgres (or accepts them in the request body when no DB pool is configured).
3. **`ai_chat_prompt.build_chat_messages`** stacks the system instruction
   (`SYSTEM_INSTRUCTION`), the "known fields" summary, the user profile JSON,
   and the chat history. The system prompt itself is the questionnaire state
   machine — Phase 1 (name → background → target role) → Phase 2 (5 basic
   mixed MCQ/text questions tailored to the user's role) → Phase 3 decide → Phase 3b
   (5 advanced) → Phase 4 wrap-up.
4. **`ai_chat_llm_client.create_chat_completion`** hits Ollama's OpenAI-
   compatible `/chat/completions` with conservative sampling (`temperature 0.3`,
   `top_p 0.9`, `frequency_penalty 0.3`, `presence_penalty 0.2`,
   `max_tokens 220`) and explicit stop tokens. A **gibberish detector**
   (`_looks_like_gibberish`) refuses garbage output and surfaces an actionable
   error instead of forwarding the noise back to the client.
5. The cleaned response is persisted as `role='assistant'` in `chat_messages`,
   and a `ConversationSummary` (skills + goals mentioned this turn) is
   computed for the client.

### Roadmap generation flow

`ai_roadmap_service.handle_generate` takes `{role, user_profile}`, builds a
prompt that asks the LLM to emit strict JSON with `{stages[], tools[],
final_projects[], visualization{}}`, parses it, and returns a typed
`AIRoadmapGenerateResponse`. The mobile app's `roadmapService.ts` later splits
this into `ai_roadmaps` + `ai_roadmap_steps` rows.

### Skill-gap analysis

`ai_skill_gap_service.handle_analysis` compares the user's `current_skills`
against a hard-coded "required skills for role X" table augmented by the LLM,
and returns `{missing_skills[], partial_gaps[], strengths[], recommendations[]}`.

### Live job search

`ai_job_search.search_jobs` calls two free APIs in sequence:
- **Remotive** (`scrape_remotive`) — sweeps 8 categories per request and dedups.
- **Arbeitnow** (`scrape_arbeitnow`) — single endpoint.

Results are passed through `_job_matches_keywords` which **requires every
search keyword to appear in title/company/location/description** — preventing
"search for AI returns a frontend role" type leaks.

### Background worker

`trend_worker.py` is a standalone CLI (run with `python trend_worker.py
--query "software engineer"`) that scrapes job postings, extracts skill
mentions with regex + LLM assistance, and writes weekly demand scores into
`skill_trends`. Schedule it however you like (cron, Windows Task Scheduler,
Replit deployments…).

### Ollama dependency
Configured in `ai_chat_config.py`:
```
ollama_url   = OLLAMA_URL or http://localhost:11434/v1
ollama_model = OLLAMA_MODEL_CHAT (chat) / OLLAMA_MODEL_EXTRACT (extraction)
timeout      = AI_TIMEOUT_SECONDS (default 180)
```

---

## 3. Mobile — Expo React Native app

**Path:** `PROJECT/mobile/artifacts/mobile/`
**Stack:** Expo 54 (React Native 0.81) · expo-router · React Query (TanStack) · Reanimated · expo-image · `@react-native-async-storage/async-storage` · Supabase JS

### What it is
The user-facing product: a guided AI career assistant that produces
personalised roadmaps, tracks step completion, surfaces job market data, and
hosts a community feed of finished roadmaps.

### Folder layout (relevant parts)
```
mobile/artifacts/mobile/
├── app/                        File-based expo-router routes
│   ├── _layout.tsx             Root Stack + ThemeProvider + QueryClient
│   ├── index.tsx               Splash / session bootstrap
│   ├── login.tsx               Email + Google + GitHub sign-in
│   ├── signup.tsx              Registration
│   ├── settings.tsx            User settings (full name edit, dark mode, sign out)
│   ├── profile-completion.tsx  Onboarding profile fields
│   ├── AIChatScreen.tsx        AI assistant (auto-starts guided questionnaire)
│   ├── ai-assistant.tsx        Wrapper that exports AIChatScreen as a route
│   ├── recommendations.tsx     Recommendation list
│   ├── job-detail.tsx          Full-page job role detail
│   └── (tabs)/
│       ├── _layout.tsx         Bottom tabs (Home, Roadmap, Community, Profile)
│       ├── index.tsx           Home dashboard (search, plan card, trending jobs)
│       ├── roadmap.tsx         Active roadmap with step CRUD + share/regenerate
│       ├── community.tsx       Shared roadmap feed
│       └── profile.tsx         Profile + stats + menu → User Settings
├── components/                 Shared UI (chat bubbles, KAVCompat, error boundary)
├── constants/
│   └── theme.ts                ThemeProvider, DarkTheme/LightTheme palettes, useTheme hook
├── hooks/
│   ├── useAIProfile.ts         React Query wrapper over stored AI profile
│   └── …
├── services/
│   ├── supabaseService.ts      Direct Supabase REST helpers (createRoadmap, shareCompletedRoadmap, getJobRoles, ensureJobRoleByTitle, fetchProfileContext, getCommunityRoadmapShares, …)
│   ├── roadmapService.ts       generateAndSaveRoadmap pipeline (calls Ollama → persists)
│   ├── onboardingService.ts    Shared types + system-prompt builders for the assessment
│   └── ollamaService.ts        Lightweight Ollama HTTP client used during onboarding
└── lib/
    ├── api/
    │   ├── mobileApi.ts        REST helpers against the Node backend (auth-tokened fetch)
    │   ├── chatApi.ts          sendChatMessageAI / fetchChatHistoryAI
    │   ├── profileApi.ts       profile-specific REST helpers
    │   └── runtime.ts          Token storage, API base URL detection
    ├── auth/                   OAuth helpers (signInWithOAuthProvider)
    └── profileScore.ts         Heuristic profile completeness 0–100
```

### Navigation & layout
- Root stack is defined in `app/_layout.tsx`. The `(tabs)` group hosts the
  bottom tab navigator from `app/(tabs)/_layout.tsx`.
- Visible tabs: **Home · Roadmap · Community · Profile**. `skills`,
  `learn`, `trends` exist as files but are hidden via `{ href: null }`.

### Theming
`constants/theme.ts` exports `DarkTheme` + `LightTheme` palettes and a
`ThemeProvider` that:
- reads the user's stored preference from `AsyncStorage` (`@nexapath_theme_pref`),
- syncs the OS appearance via `Appearance.setColorScheme`,
- exposes `useTheme()` (returns the current `AppTheme` object) and
  `useThemePreference()` (returns `{preference, setPreference, effective}`).

All screens build their `StyleSheet` inside the component (e.g. `const s = makeStyles(theme)`) so dark/light switching is reactive.

### Core feature flows

**Sign in / sign up**
- `login.tsx` calls `useLoginAuth` from `@workspace/api-client-react`, stores
  the returned token via `storeMobileAccessToken`, then `router.replace('/(tabs)')`.
- OAuth: `signInWithOAuthProvider('google'|'github')` uses
  `expo-web-browser` + `expo-auth-session`.

**AI Assistant (the guided assessment)**
- File: `app/AIChatScreen.tsx`.
- On mount it (a) probes `fetchChatHistoryAI` to decide if the "Past chats"
  chip should appear, (b) checks `AsyncStorage @nexapath_pending_chat` for a
  CTA-seeded message, and (c) **always kicks off `kickoffGuidedFlow()`** so
  the AI asks Q1 immediately — even if prior history exists.
- `kickoffGuidedFlow` sends a hidden "begin the assessment" message;
  the LLM's reply is rendered as the first AI bubble.
- The "Past chats" chip (top-right) loads server-side history into the same
  view; "New chat" wipes it and re-runs the guided flow.

**Build a roadmap**
- Home (`(tabs)/index.tsx`), Roadmap empty state, Recommendations CPU icon all push to `/ai-assistant`.
- After the assessment, the user taps "Generate Roadmap" inside the chat;
  `roadmapService.generateAndSaveRoadmap` builds the gap analysis, calls
  Ollama for the step plan, then persists into `ai_roadmaps` +
  `ai_roadmap_steps` via Supabase REST.

**Roadmap tracking** (`(tabs)/roadmap.tsx`)
- `loadRoadmap` fetches the active roadmap (`getRoadmapWithSteps`).
- `handleStatusChange` flips a step to `in_progress` / `completed` with an
  optimistic update + Supabase patch.
- When `completedSteps === totalSteps`, an extra full-width **green
  "Generate your next roadmap"** button pushes back into `/ai-assistant`.
- The Share button always opens the native Share sheet with a formatted
  summary, and additionally writes to `community_roadmap_shares` when complete.

**Community feed** (`(tabs)/community.tsx`)
- Reads `getCommunityRoadmapShares()` from Supabase directly. Items render with
  the sharer's `full_name`, target role title, summary, completion count, and
  date. Uses `RefreshControl` for pull-to-refresh.

**Job search & detail**
- Home page has an AI Job Search input. `searchJobsWithAi` → backend → AI
  `/api/jobs/search` → keyword-filtered Remotive + Arbeitnow results.
- Result cards are `Pressable`; `openSearchResult` opens the posting URL via
  `Linking`. Cards without a URL are disabled.
- `job-detail.tsx` shows full job info: hero image, demand-history chart
  (custom SVG), salary stats, market overview, required skills, career path.

**Settings** (`settings.tsx`)
- Editable **Full name** row (inline TextInput, save → `updateCurrentUserAccount`).
- **Dark mode** toggle that calls `useThemePreference().setPreference('dark'|'light')`. A "Match system" row appears once the user manually overrides.
- **About** card: version only.
- **Sign out** card at the bottom.

### Mobile services in depth

- **`supabaseService.ts`** — typed wrappers around the Supabase REST API
  (PostgREST). Notable exports: `sbGet/sbPost/sbPatch/sbUpsert/sbDelete`,
  `getJobRoles`, `ensureJobRoleByTitle` (auto-inserts a `job_roles` row when
  the user picks a custom target like "cybersecurity"), `fetchProfileId`,
  `fetchProfileContext`, `createRoadmap`, `createRoadmapSteps`,
  `updateRoadmapStepStatus`, `shareCompletedRoadmap`,
  `getCommunityRoadmapShares`, chat session CRUD.

- **`roadmapService.ts`** — `generateAndSaveRoadmap(profileId, collected, jobRole, msgs, onProgress)`:
  1. Updates the profile with name/education/experience.
  2. Upserts user skills.
  3. Runs `analyzeSkillGaps` (compares user skills vs role requirements).
  4. Calls Ollama (`callOllamaRoadmapGeneration`) for the step plan; falls
     back to `buildFallbackRoadmap` on failure.
  5. Sanitises the response (`sanitizeRoadmap`) and persists.

- **`onboardingService.ts`** — shared types (`CollectedData`,
  `OnboardingMessage`, `OnboardingState`) and prompt builders
  (`buildSetupSystemPrompt`, `buildProfileCollectionPrompt`,
  `buildBasicAssessmentSystemPrompt`, `buildAdvancedAssessmentSystemPrompt`).
  The setup prompt enforces the "**target role stays whatever the user named**"
  rule — never silently reroutes to a similar role.

- **`lib/api/mobileApi.ts`** — every call to the Node backend. Adds the JWT
  via `lib/api/runtime.getMobileAccessToken`. Exports
  `getHomeData`, `searchJobsWithAi`, `updateCurrentUserAccount`,
  `generateRoadmapWithAi`, `analyzeSkillGapsWithAi`, etc.

- **`lib/api/chatApi.ts`** — `sendChatMessageAI(text)` →
  `POST /api/user/ai/chat`. `fetchChatHistoryAI()` →
  `GET /api/user/ai/history`. Both unwrap the `{success, data}` envelope.

---

## 4. Frontend — Web admin dashboard

**Path:** `PROJECT/frontend/`
**Runs at:** Vite dev server (`pnpm/npm run dev` → `http://localhost:5173`)
**Stack:** React 18 · Vite · TypeScript · React Router v6 · TanStack React Query · Radix UI · shadcn/ui · TailwindCSS · Axios

### What it is
The "back office" web app — used by admins (and anyone with a desktop browser)
to view dashboards, manage taxonomy, browse the community feed, and chat with
the AI. It hits the same Express backend at port 5000.

### Folder layout
```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── src/
    ├── main.tsx               Vite entry; mounts <App/>
    ├── App.tsx                BrowserRouter + AuthProvider + route table
    ├── index.css              Tailwind directives + theme tokens
    ├── pages/                 One file per route
    ├── component/             Layout + shared widgets (sidebar, header, ui/)
    ├── contexts/AuthContext.tsx   Session + login/logout
    ├── hooks/                 use-toast, use-mobile, useTheme
    ├── lib/
    │   ├── api.ts             Axios client + per-resource service objects
    │   └── utils.ts           cn() Tailwind merger
    ├── types/                 Shared TS types
    ├── utils/formatters.ts
    └── test/                  Vitest setup
```

### Routing (`App.tsx`)
`<App>` wraps everything in `QueryClientProvider` + `TooltipProvider` +
`Toaster` + `BrowserRouter` + `AuthProvider`. Routes:

- `/login` — public (redirects to `/` if already authenticated).
- Every other path is protected (`ProtectedRoutes` redirects to `/login` when
  unauthenticated, otherwise renders `<DashboardLayout>` with the matching
  page inside).

| Route               | Page                  |
| ------------------- | --------------------- |
| `/`                 | `Dashboard.tsx`       |
| `/courses`          | `Courses.tsx`         |
| `/courses/:id`      | `CourseDetail.tsx`    |
| `/skills`           | `Skills.tsx`          |
| `/users`            | `UsersPage.tsx`       |
| `/job-roles`        | `JobRoles.tsx`        |
| `/roadmaps`         | `Roadmaps.tsx`        |
| `/roadmaps/:id`     | `RoadmapDetail.tsx`   |
| `/community`        | `Community.tsx`       |
| `/subscriptions`    | `Subscriptions.tsx`   |
| `/ai-chat`          | `AIChat.tsx`          |
| `/ai-roadmap`       | `AIRoadmapGenerator.tsx` |
| `/settings`         | `SettingsPage.tsx`    |

### Layout & UI primitives
- `component/DashboardLayout.tsx` renders the persistent left sidebar
  (`Appsidebar.tsx`) and a top header (`DashboardHeader.tsx`).
- `component/ui/` holds the shadcn-style primitives (button, card, dialog,
  toast, tooltip, etc.) built on Radix.
- `component/ErrorBoundary.tsx` wraps page contents to surface render errors.

### Auth context (`contexts/AuthContext.tsx`)
- Reads `localStorage` for a persisted token on mount.
- Calls `/api/auth/me` on init; on success sets `{user, isAuthenticated:true}`.
- `login(email, password)` → `/api/auth/login` → persists token → updates state.
- `logout()` → `/api/auth/logout` → clears `localStorage` + state.

### Data fetching (`lib/api.ts`)
- Axios instance with a baseURL of `import.meta.env.VITE_API_URL ||
  http://localhost:5000/api`. Response interceptor strips the
  `{success: true, data: …}` envelope so callers get `Promise<T>` directly.
- Per-resource service objects: `courseService`, `skillService`,
  `categoryService`, `planService`, `jobRoleService`, `roadmapService`,
  `subscriptionService`, `progressService`, `userService`, `adminService`,
  `communityService` (new — backs the Community page).
- A second Axios client `aiClient` (baseURL `VITE_AI_URL`, default
  `http://localhost:8000`) is used directly by `aiChatService`,
  `aiRoadmapService`, `aiSkillGapService` for screens that talk to the AI
  service without going through the Node backend.

### Page highlights
- **`Dashboard.tsx`** — high-level KPI tiles + recent activity. Pulls
  `adminService.getStats()`.
- **`Roadmaps.tsx` + `RoadmapDetail.tsx`** — list + drill-down for AI roadmaps
  (admin view).
- **`AIChat.tsx`** — replicates the mobile assistant on web; hits
  `aiChatService.chat`.
- **`AIRoadmapGenerator.tsx`** — single form → calls
  `aiRoadmapService.generate` and renders the resulting stages/projects/tools.
- **`Community.tsx`** — fetches `communityService.getShares()` and lists
  shared completed roadmaps with sharer name, target role, summary, completion
  badge, and date. Loading / empty / error states are all handled.
- **`SettingsPage.tsx`** — admin profile + theme + account settings.

---

## 5. Database — Supabase Postgres

**Path:** `PROJECT/backend/database/schema.sql` (+ migrations alongside)

A single shared database keyed off `DATABASE_URL` / `SUPABASE_URL`. Auth lives
in the managed `auth.users` schema (Supabase Auth); everything else is under
`public`.

### Public tables (in order from schema.sql)

| #  | Table                         | Purpose                                                |
| -- | ----------------------------- | ------------------------------------------------------ |
|  1 | `users`                       | (legacy mirror — auth lives in `auth.users`)           |
|  2 | `profiles`                    | Per-user profile: `full_name`, `domain`, `title`, `experience_level`, `bio`, explicit_* JSONB hints |
|  3 | `skills`                      | Skill catalogue (name, category)                       |
|  4 | `user_skills`                 | M-to-M user ⇄ skill with proficiency level             |
|  5 | `skill_gaps`                  | Computed gap rows per user                             |
|  6 | `trends`                      | Career trend rows                                      |
|  7 | `trend_skills`                | Trend ⇄ skill junction                                 |
|  8 | `recommendations`             | Personal recommendations                               |
|  9 | `chat_history`                | (legacy) Flat per-user chat rows                       |
| 10 | `user_ai_profile`             | JSONB store of LLM-extracted profile                   |
| 11 | `skill_trends`                | Weekly demand scores produced by `trend_worker.py`     |
| 12 | `community_roadmap_shares`    | Shared completed roadmaps for the Community feed       |
| -- | `chat_sessions`               | Per-conversation envelope (created by mobile)          |
| -- | `chat_messages`               | Persisted assistant + user turns                       |
| -- | `ai_roadmaps`                 | Generated roadmaps                                     |
| -- | `ai_roadmap_steps`            | Steps inside a roadmap, with status/resources          |
| -- | `job_roles`                   | Target role catalogue                                  |
| -- | `raw_jobs`                    | Untouched scraped payloads (Remotive, Adzuna, …)       |
| -- | `normalized_jobs`             | Cleaned/searchable job rows                            |
| -- | `trending_snapshots`          | Per-region trending job snapshot blob                  |

### Migrations
- `migration_add_job_aggregation.sql` — `raw_jobs`, `normalized_jobs`,
  `trending_snapshots`, dedup function.
- `migration_add_community_roadmap_shares.sql` — Community feed table.
- `migration_add_remotive_source.sql` — widens the `raw_jobs.source` CHECK
  constraint to include `'remotive'` so the seeder can write.

A shared trigger `update_updated_at_column()` auto-bumps `updated_at` on
every relevant table.

---

## 6. Cross-cutting concepts

### Authentication
- Supabase Auth (`auth.users`) is the source of truth.
- The Node backend (`authController`) wraps `supabaseAdmin.auth.admin.createUser`
  + `supabase.auth.signInWithPassword` and returns `{ token, refreshToken }`
  on login.
- Mobile stores the access token via `lib/api/runtime.ts` and attaches it as
  `Authorization: Bearer …` to every backend call.
- Web stores it in `localStorage` (`AuthContext`), same `Authorization` header.

### Configuration
Environment variables live in three `.env` files:
- `PROJECT/backend/.env` — DB URL, Supabase keys, JWT, Ollama, AI service URL.
- `PROJECT/ai/.env` — `DATABASE_URL`, `OLLAMA_URL`, `OLLAMA_MODEL_CHAT`,
  `OLLAMA_MODEL_EXTRACT`, `AI_PORT`, `AI_REQUIRE_AUTH`, `AI_TIMEOUT_SECONDS`.
- `PROJECT/mobile/artifacts/mobile/.env` (optional) — `EXPO_PUBLIC_API_URL`,
  `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

### Local development
1. Start Ollama (`ollama serve`) and make sure the model in `.env` is pulled.
2. From `PROJECT/backend/`: `npm run dev` (boots backend + AI + status panel).
3. From `PROJECT/frontend/`: `pnpm run dev` (or `npm run dev`).
4. From `PROJECT/mobile/artifacts/mobile/`: `npx expo start` (add `--offline`
   if Expo's version-check fetch fails).
5. Seed Remotive jobs once: `cd PROJECT/backend && npm run seed:remotive`.

### LLM safety net
- `ai_chat_llm_client.py` applies conservative sampling and a gibberish
  detector that rejects garbage token output and tells the caller to re-pull
  the model or fall back to a smaller variant.
- `qwenController.js` (backend) ships a deterministic mock mode for offline
  development when `QWEN_API_KEY` isn't set.

---

## 7. Where to look when…

| You want to…                                       | Start here                                            |
| -------------------------------------------------- | ----------------------------------------------------- |
| Add a new mobile screen                            | `app/(tabs)/` or `app/`, then register in `_layout.tsx` if outside `(tabs)` |
| Add a new backend endpoint                         | New route in `backend/src/routes/`, controller in `controllers/`, mount in `app.js` |
| Change the questionnaire flow                      | `ai/ai_chat_prompt.py` (`SYSTEM_INSTRUCTION`)         |
| Tweak roadmap-generation prompt                    | `ai/ai_roadmap_service.py`                            |
| Adjust LLM sampling / model                        | `ai/ai_chat_llm_client.py` + `ai/.env`                |
| Add a new public web page                          | `frontend/src/pages/`, then add a route in `App.tsx` and a sidebar entry |
| Add a new column to a table                        | Write a `migration_*.sql` next to `schema.sql`, run in Supabase SQL Editor |
| Add a new job source                               | Backend cron in `backend/src/jobs/aggregator.cron.js` + a scraper in `backend/src/scrapers/`, OR extend `ai/ai_job_search.py` |
| Override the AI assistant's first message          | `kickoffGuidedFlow` in `mobile/.../app/AIChatScreen.tsx` |
| Reset / clear chat history                         | Delete rows in `chat_sessions` + `chat_messages` for the profile |

---
*Last regenerated by Claude on 2026-05-14.*
