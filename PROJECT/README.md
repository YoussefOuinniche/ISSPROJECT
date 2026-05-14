# NexaPath Mobile App

NexaPath is an AI-powered mobile learning and career guidance app. It helps a user define a target role, assess their current skill level, generate a personalized learning roadmap, track progress step by step, discover job-market trends, and chat with an AI career assistant.

The mobile app is built with Expo, React Native, Expo Router, React Query, and generated TypeScript API clients. It is part of a larger full-stack workspace that includes a Node.js backend, a FastAPI AI service, Supabase/PostgreSQL data storage, and a React admin dashboard.

## Project Context

NexaPath is designed around one core user journey:

1. A learner creates an account or signs in.
2. The app checks whether a valid session already exists and routes the user automatically.
3. If the learner has no roadmap yet, the app guides them through an AI onboarding assessment.
4. The assessment collects profile information, target role, current skills, education, experience, weekly learning availability, and knowledge scores.
5. The roadmap generator analyzes skill gaps, maps those gaps to learning resources, asks the local LLM for a structured learning plan, then saves the roadmap and steps.
6. The learner follows the roadmap, marks steps as started or completed, and can share a completed roadmap with the community.
7. The learner can use AI chat, recommendations, job search, trends, and profile insights to keep the plan aligned with their career goal.

## Repository Layout

```text
PROJECT/
  ai/                              FastAPI AI service and LLM integration
  backend/                         Node.js/Express API, auth, Supabase models, job aggregation
  frontend/                        React/Vite admin dashboard
  mobile/
    package.json                   PNPM workspace scripts
    lib/                           Generated API packages and DB helper packages
    artifacts/
      mobile/                      Expo React Native mobile app
      api-server/                  Lightweight API server artifact
  project_requirements/            Project PDFs and diagrams
```

The mobile app source is located at:

```text
PROJECT/mobile/artifacts/mobile
```

## Mobile App Structure

```text
PROJECT/mobile/artifacts/mobile/
  app/                             Expo Router screens and route groups
    _layout.tsx                    Root stack, font loading, API runtime setup
    index.tsx                      Splash/session bootstrap screen
    login.tsx                      Email login
    signup.tsx                     Account registration
    onboarding-chat.tsx            AI onboarding assessment chat
    recommendations.tsx            AI recommendation view
    profile-completion.tsx         Profile completion workflow
    job-detail.tsx                 Job role detail view
    settings.tsx                   Account/profile settings
    (tabs)/
      _layout.tsx                  Bottom tab navigation
      index.tsx                    Today/home dashboard
      roadmap.tsx                  Learning roadmap and step tracking
      community.tsx                Shared completed roadmaps
      profile.tsx                  Profile, progress, AI insights, account menu
      ai-chat.tsx                  Hidden tab route for AI chat
      skills.tsx                   Hidden tab route for skill detail/workflows
      learn.tsx                    Hidden tab route for learning content
      trends.tsx                   Hidden tab route for market trends
  components/                      Reusable UI, chat, profile, roadmap components
  constants/                       Theme, color, profile option, roadmap role constants
  hooks/                           Shared hooks such as AI profile cache
  lib/                             Runtime, API helpers, layout, scoring utilities
  services/                        Backend, Supabase, onboarding, roadmap, Ollama services
  assets/images/                   App icon, splash, logo assets
```

## Main Features

### Authentication

- Email/password login and registration.
- JWT token persistence with `@react-native-async-storage/async-storage`.
- Automatic boot routing from `app/index.tsx`.
- Logout clears local token state and React Query cache.
- Google sign-in buttons exist in the UI, but OAuth configuration is not wired yet.

### Runtime API Discovery

The app configures its backend URL at startup in `lib/api/runtime.ts`.

It tries these candidates:

1. `app.json` / Expo `extra.apiBaseUrl`, if provided.
2. Backend URL derived from the Expo development host IP.
3. Cached working backend URL from AsyncStorage.
4. `http://localhost:5000`.

Each candidate is checked through `/health`. The first reachable URL becomes the API base URL for generated React Query hooks and custom fetch helpers.

### Today Dashboard

The `Today` tab gives the learner a compact daily overview:

- Current roadmap status and next step CTA.
- A "build my roadmap" CTA when no roadmap exists.
- AI job search for roles, skills, or keywords.
- Global trending roles.
- Tunisia market data.
- Salary ranking in TND.
- Pull-to-refresh loading behavior.

### AI Onboarding Assessment

The onboarding flow is implemented through `services/onboardingService.ts` and `services/roadmapService.ts`.

It collects:

- Full name.
- Target career role.
- Education level.
- Years of experience.
- Weekly learning availability.
- Current stack/tools.
- Basic and advanced assessment answers.
- Compatibility percentage and overall level.

The assessment uses a conversational state machine:

```text
GREETING
COLLECT_NAME
COLLECT_TARGET_ROLE
COLLECT_PROFILE
ASSESS_BASIC
ASSESS_ADVANCED
SHOW_COMPATIBILITY
GENERATING_ROADMAP
ROADMAP_READY
```

### Roadmap Generation

The roadmap generation pipeline is:

```text
profile update
  -> skill gap analysis
  -> course/resource mapping
  -> LLM structured roadmap generation
  -> roadmap sanitization
  -> Supabase persistence
  -> chat history persistence
  -> notification creation
```

If Ollama or the AI generator fails, the app creates a fallback roadmap from detected gap skills so the user still gets a usable plan.

Each roadmap step can include:

- Title and description.
- Status: `locked`, `available`, `in_progress`, `completed`, or `skipped`.
- Skill and course links.
- Estimated duration.
- Provider resources for Coursera, Udemy, YouTube, edX, or fallback search links.

### Roadmap Tracking

The `Roadmap` tab supports:

- Loading the latest active or completed roadmap for the current profile.
- Selecting individual roadmap steps.
- Starting and completing steps.
- Progress percentage calculation.
- Auto-generated resource links when no curated resources are stored.
- Sharing a completed roadmap to the community feed.

### Community

The `Community` tab lists public roadmap shares from `community_roadmap_shares`.

It shows:

- Shared roadmap title.
- Learner display name.
- Target role.
- Summary.
- Completed step count.
- Share date.

### Profile and AI Insights

The `Profile` tab combines backend profile data and AI-derived profile data.

It displays:

- User identity and email.
- Rank, tier, XP-style profile completeness, streak placeholder, and badges.
- Skill elevation bars.
- AI-inferred top goal and profile hint.
- Account actions for settings, recommendations, AI roadmap, privacy/help placeholders, and sign out.

The hook `hooks/useAIProfile.ts` keeps AI profile data in a small global cache so profile-related screens can share fresh AI context.

### AI Chat and AI APIs

The app uses backend-proxied AI endpoints instead of calling the AI service directly for most user features.

Relevant helpers:

- `lib/api/chatApi.ts` sends messages to `/api/user/ai/chat` and reads `/api/user/ai/history`.
- `lib/api/profileApi.ts` loads explicit and AI-enriched profile data from `/api/user/profile`.
- `lib/api/mobileApi.ts` includes AI helpers for skill gaps, roadmap generation, recommendations, career advice, job descriptions, and job search.

## Technology Stack

| Area | Technology |
| --- | --- |
| Mobile framework | Expo SDK 54, React Native 0.81 |
| Navigation | Expo Router 6 |
| UI | React Native, Expo Image, Expo Linear Gradient, Feather icons |
| Animation | React Native Reanimated |
| Server state | TanStack React Query |
| Local storage | AsyncStorage |
| API client | Generated `@workspace/api-client-react` plus custom fetch helpers |
| Backend | Node.js, Express, JWT, Supabase client |
| AI service | Python, FastAPI, Ollama |
| Database | Supabase/PostgreSQL |
| Package manager | PNPM workspace |

## Prerequisites

- Node.js 18 or newer.
- PNPM.
- Python 3.11 or newer.
- Expo Go on a physical iOS/Android device, or an emulator/simulator.
- A Supabase project with the schema/migrations from `PROJECT/backend/database`.
- Ollama installed locally when testing AI generation.
- Optional: Adzuna API credentials for live job aggregation.

## Environment Configuration

### Backend

Create `PROJECT/backend/.env` from `PROJECT/backend/.env.example`.

Important values:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
ADZUNA_APP_ID=your_adzuna_app_id_here
ADZUNA_API_KEY=your_adzuna_api_key_here
REDIS_URL=redis://localhost:6379
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
PORT=5000
JWT_SECRET=change_this_in_development
JWT_EXPIRE=7d
```

### Mobile

The mobile app can run without an explicit `.env` because `lib/api/runtime.ts` attempts to auto-detect the backend from the Expo host.

For explicit configuration, provide an Expo `extra.apiBaseUrl` value in `app.config.js` or `app.json`, or use the existing `EXPO_PUBLIC_API_URL` path for the legacy Axios service in `services/api.js`.

Example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.50:5000
```

Use your computer's LAN IP when testing from a physical device. `localhost` on a phone points to the phone, not your computer.

### AI Service

The Python AI service reads its own environment variables from the `ai` folder. Common values are:

```env
AI_REQUIRE_AUTH=false
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

## Installation

From the workspace root:

```powershell
cd PROJECT
```

Install backend dependencies:

```powershell
cd backend
npm install
```

Install AI service dependencies:

```powershell
cd ..\ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Install mobile workspace dependencies:

```powershell
cd ..\mobile
pnpm install
```

If PNPM is missing:

```powershell
npm install -g pnpm
```

## Running Locally

Start Ollama:

```powershell
ollama serve
```

Pull the model used by the backend or AI service:

```powershell
ollama pull qwen2.5:7b
```

Start the backend and AI service:

```powershell
cd PROJECT\backend
npm run dev
```

The backend script starts:

- Express API on port `5000`.
- FastAPI AI service on port `8000`.

Start the mobile app:

```powershell
cd PROJECT\mobile
pnpm --dir artifacts/mobile run start
```

Alternative with explicit Expo host mode:

```powershell
cd PROJECT\mobile\artifacts\mobile
$env:MOBILE_HOST="lan"
$env:MOBILE_PORT="8081"
pnpm run start
```

Then scan the Expo QR code with Expo Go.

## Useful Scripts

From `PROJECT/mobile`:

```powershell
pnpm --dir artifacts/mobile run start
pnpm --dir artifacts/mobile run typecheck
pnpm run build
pnpm run typecheck
```

From `PROJECT/backend`:

```powershell
npm run dev
npm run dev:backend
npm run dev:ai
npm start
```

From `PROJECT/mobile/artifacts/mobile`:

```powershell
pnpm run start
pnpm run build
pnpm run serve
pnpm run typecheck
```

## Backend Endpoints Used by Mobile

The mobile app uses these backend routes heavily:

```text
GET  /health
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET  /api/auth/me
GET  /api/user/home
GET  /api/user/profile
PUT  /api/user/profile
POST /api/user/profile/update
GET  /api/user/skills
POST /api/user/skills
PUT  /api/user/skills/:skillId
DELETE /api/user/skills/:skillId
POST /api/user/ai/chat
GET  /api/user/ai/history
POST /api/user/ai/skill-gaps/analyze
POST /api/user/ai/roadmap
POST /api/user/ai/recommendations/generate
POST /api/user/ai/career-advice
POST /api/user/ai/job-description
GET  /api/user/ai/jobs/search
GET  /api/user/ai/jobs/trending
GET  /api/v1/job-info/:slug
GET  /api/v1/demand-history/:slug
```

## Data Model Areas

The app expects Supabase tables for:

- Users and profiles.
- Skills and categories.
- User skills.
- Job roles and market trends.
- Courses and course-skill mapping.
- AI roadmaps and AI roadmap steps.
- Chat sessions and chat messages.
- Notifications.
- Community roadmap shares.

Database migrations live in:

```text
PROJECT/backend/database
```

## Important Implementation Notes

- `lib/api/runtime.ts` must run before generated API hooks make authenticated requests. It is called from the root app layout.
- The mobile app stores backend JWTs under `sp.accessToken`.
- The generated client package is imported as `@workspace/api-client-react`.
- Some screens use generated React Query hooks, while others use custom fetch helpers in `lib/api`.
- `services/supabaseService.ts` currently contains direct Supabase REST access for mobile roadmap/community workflows. This is acceptable for a demo/local prototype, but production mobile apps must not embed a service-role key. Move these writes behind authenticated backend endpoints before release.
- `run-mobile-expo.ps1` currently points to an older `Skill-Pulse-1\artifacts\mobile` path. Prefer the PNPM commands above unless that script is updated to `mobile\artifacts\mobile`.
- Some files contain older "SkillPulse" naming, while the current app branding in `app.json` and UI is `NexaPath`.

## Troubleshooting

### The mobile app cannot reach the backend

- Confirm the backend is running on port `5000`.
- Open `http://localhost:5000/health` on the development machine.
- If using a physical phone, use LAN mode and make sure the phone and computer are on the same network.
- Clear the cached API URL by calling `resetApiRuntime()` during development or by clearing app storage.

### Login works in browser but not on phone

Use the computer's LAN IP instead of `localhost`.

Example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.50:5000
```

### Roadmap generation fails

- Confirm Ollama is running.
- Confirm the requested model is pulled.
- Confirm the AI service is running on port `8000`.
- Check backend logs for AI proxy or Supabase errors.
- The mobile app can fall back to a non-LLM roadmap if generation fails, but database writes still require valid Supabase configuration.

### PNPM install fails

The workspace enforces PNPM in `PROJECT/mobile/package.json`. Use:

```powershell
corepack enable
pnpm install
```

or install PNPM globally:

```powershell
npm install -g pnpm
```

## Current Status

The mobile app already includes the main product surface:

- Authentication screens.
- Session bootstrap and API runtime setup.
- Home dashboard.
- AI job search.
- AI onboarding and roadmap generation services.
- Roadmap progress tracking.
- Community roadmap sharing.
- Profile and AI insight views.
- AI chat API integration.

The biggest production hardening tasks are:

- Move direct Supabase service-role mobile calls behind backend endpoints.
- Finish OAuth configuration or remove Google sign-in CTAs.
- Normalize old naming from SkillPulse to NexaPath.
- Add automated tests for auth, runtime URL detection, roadmap state changes, and AI API failures.
- Update `run-mobile-expo.ps1` to the current folder structure.
