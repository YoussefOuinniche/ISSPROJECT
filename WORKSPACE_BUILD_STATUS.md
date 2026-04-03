# SkillPulse Workspace Build Status

## Date
- 2026-03-21

## Executive Summary
This workspace currently contains **two parallel SkillPulse implementations**:

1. Legacy full-stack implementation:
- Node/Express backend in `Backend`
- React admin portal in `interface`

2. New monorepo implementation:
- pnpm + TypeScript workspace in `Skill-Pulse-1`
- Includes API server, Expo mobile app, and shared generated libraries

The project is feature-rich but split across these tracks rather than consolidated into one single runtime stack.

---

## 1) Legacy Backend (`Backend`)

### Core Runtime
- Express app bootstrapped in `Backend/app.js`
- Security middleware in place:
  - `helmet`
  - global and auth-specific `express-rate-limit`
  - CORS allowlist logic
- Logging and body parsing:
  - `morgan`
  - JSON and URL-encoded parsing
- Centralized error handling middleware
- Graceful shutdown handlers and process signal handling

### API Route Surface
Implemented route groups:
- Auth: `Backend/routes/Auth.js`
  - register, login, refresh-token, forgot-password, reset-password, me, logout
- User: `Backend/routes/User.js`
  - profile read/upsert, account update/delete, user skills CRUD, skill-gaps, recommendations, dashboard
- Skills: `Backend/routes/Skills.js`
  - public listing/search/categories/stats and protected create/update/delete/bulk
- Trends: `Backend/routes/Trends.js`
  - public listing/search/recent/domains and protected create/update/delete/bulk
- Public/Admin data: `Backend/routes/Public.js`
  - dashboard and protected admin datasets (users/content/analytics/settings)

### Data Layer
- DB config in `Backend/config/database.js`
- SQL schema and migration files in `Backend/database`
- Model files in `Backend/models`

### Dependencies
`Backend/package.json` includes:
- Auth/security: `jsonwebtoken`, `bcrypt`, `bcryptjs`, `express-validator`, `helmet`, `express-rate-limit`
- API/platform: `express`, `cors`, `morgan`, `dotenv`
- Data: `pg`, `sequelize`, `pg-hstore`
- Supabase client: `@supabase/supabase-js`

---

## 2) Legacy AI Service (`Backend/ai`)

### Service Architecture
- FastAPI service in `Backend/ai/backend.py`
- Utility modules in `Backend/ai/tools.py` and `Backend/ai/scraper.py`

### AI Model Build (Current Implementation)

#### Runtime + Model Provider
- The service uses an OpenAI-compatible client (`openai` package) but points to a local Ollama endpoint:
  - `OLLAMA_URL`: `http://localhost:11434/v1`
  - `OLLAMA_MODEL`: `gemma3:1b`
- Generation is executed through chat completions with:
  - `temperature = 0.7`
  - request timeout up to 300s
  - simple retry loop (2 attempts)
- This means the "model" is not a custom-trained SkillPulse neural model yet; it is an orchestrated LLM service around a local foundation model.

#### Core AI Pattern Used
- The system follows a **prompt-orchestration pattern**:
  - fetch user/profile/trend context
  - build structured prompts
  - ask LLM to return strict JSON
  - parse and normalize JSON
  - save outputs into database tables when applicable
- There is no vector database, embedding index, or fine-tuning pipeline in this code path right now.

#### Data Inputs Feeding The Model
- User context from PostgreSQL:
  - profile fields (role, target role, experience, education, bio)
  - user skills with proficiency and years of experience
- Trend context from database (`trends` table) for recommendation prompts
- External labor-market context from web scraping:
  - BLS OOH
  - Hiring Lab
  - NACE
- Scraped snippets are trimmed and injected into prompts as compact context blocks.

#### Endpoint-Level AI Workflows
- `POST /analyze-skill-gaps`
  - LLM outputs structured skill-gap JSON with domain, criticality, and reason
  - results are persisted to `skill_gaps` table (old AI-tagged rows are replaced)
- `POST /generate-roadmap`
  - LLM produces phased roadmap JSON (phases, tasks, resources, milestones)
- `POST /recommend`
  - LLM generates actionable recommendation items with type/priority
  - output is persisted to `recommendations` table
- `POST /career-advice`
  - free-form personalized advisory response, optionally profile-conditioned
- `POST /generate-job-description`
  - two-stage generation flow:
    - Part 1: role without AI vs role with AI tasks
    - Part 2: strategic analysis lists (gaps, transformations, recommendations, sustainability impact)
  - includes fallback repair/normalization when model output is incomplete
- `GET /models`
  - checks available models from Ollama and returns active/current model

#### Output Hardening + Reliability
- JSON parser tries multiple extraction strategies:
  - direct parse
  - fenced code block stripping
  - object/array substring recovery
- Job description flow has fallback repair prompts and default task generation when AI output is weak.
- Health check verifies both LLM connectivity and DB connectivity.

#### Tooling Around The Model
- `tools.py` exposes a 4-tool pattern used by the AI layer:
  - web scrape
  - analyze results
  - generate report text
  - generate chart assets
- `scraper.py` implements deterministic multi-source scraping and context assembly before LLM calls.

#### Current Constraints (Important)
- Model selection is static by default (`gemma3:1b`), not dynamic policy-based routing.
- No formal eval harness, benchmark suite, or prompt-versioning registry is present.
- No retrieval embeddings/vector search path is currently implemented in these files.
- Personalization quality depends heavily on DB completeness (profiles + user skills).
- Web context quality depends on scraper stability and third-party page structure changes.

#### Practical Maturity Level
- The AI service is a **working orchestration layer** suitable for prototype to early production experiments.
- It is already integrated with persistence and API contracts, but not yet a fully governed MLOps pipeline.

### Exposed Endpoints
Detected endpoints:
- `GET /health`
- `POST /analyze-skill-gaps`
- `POST /generate-roadmap`
- `POST /recommend`
- `POST /career-advice`
- `POST /generate-job-description`
- `GET /models`

### Python Stack
From `Backend/ai/requirements.txt`:
- `fastapi`, `uvicorn`
- `openai` (OpenAI-compatible client usage)
- `psycopg2-binary`
- `python-dotenv`
- `requests`, `beautifulsoup4`
- `pandas`, `matplotlib`

---

## 3) Legacy Admin Frontend (`interface`)

### Core Runtime
- React 18 + Vite app
- Entry and shell:
  - `interface/src/main.jsx`
  - `interface/src/App.jsx`

### UI Pages Implemented
In `interface/src/pages`:
- `AdminLogin.jsx`
- `Dashboard.jsx`
- `Users.jsx`
- `Content.jsx`
- `Analytics.jsx`
- `Settings.jsx`
- `Profile.jsx`

### Shared Frontend Structure
- Components: `interface/src/components`
- Hooks: `interface/src/hooks`
- Utilities: `interface/src/utils`
- API clients: `interface/src/api.js` and `interface/src/api/*`
- Styling/Tailwind config exists and is active

### Dependencies
`interface/package.json` shows:
- React ecosystem: `react`, `react-dom`, `react-router-dom`
- Data/forms/validation: `axios`, `@tanstack/react-query`, `react-hook-form`, `zod`
- UI/helpers: `lucide-react`, `framer-motion`, `styled-components`, `clsx`, `tailwind-merge`

---

## 4) New Monorepo Track (`Skill-Pulse-1`)

### Monorepo Foundations
- Root workspace package: `Skill-Pulse-1/package.json`
- pnpm workspace + TS project references
- Architecture notes in `Skill-Pulse-1/replit.md`

### Deployable Artifacts
In `Skill-Pulse-1/artifacts`:
- `api-server`
- `mobile`
- `mockup-sandbox`

### Shared Libraries
In `Skill-Pulse-1/lib`:
- `api-spec` (OpenAPI source)
- `api-client-react` (generated client/hooks)
- `api-zod` (generated schemas)
- `db` (database package)

### API Server Package
`Skill-Pulse-1/artifacts/api-server/package.json`:
- Express 5 based
- Uses workspace libs `@workspace/api-zod` and `@workspace/db`
- Build via esbuild
- Typecheck script present

---

## 5) Mobile App Status (`Skill-Pulse-1/artifacts/mobile`)

### App Architecture
- Expo Router app
- Package manifest in `Skill-Pulse-1/artifacts/mobile/package.json`
- Route structure in `Skill-Pulse-1/artifacts/mobile/app`
  - includes landing/login/admin/settings/recommendations and tabbed navigation sections

### Expo Config
From `Skill-Pulse-1/artifacts/mobile/app.json`:
- App name: SkillPulse
- New architecture enabled
- Typed routes + react compiler experiments enabled

### Branding Update Applied
Main mobile branding assets are already replaced with the uploaded SkillPulse logo:
- `Skill-Pulse-1/artifacts/mobile/assets/images/icon.png`
- `Skill-Pulse-1/artifacts/mobile/assets/images/splash-icon.png`

---

## 6) Current Runtime Notes

- Expo/Metro can run for mobile, but reload only works after a client is attached.
- If terminal shows "No apps connected", it means the bundler is up but no emulator/phone is connected to that session yet.

---

## 7) Practical Conclusion

What is built so far is substantial and includes:
- Full backend route architecture
- AI recommendation service
- Admin web UI with multiple operational pages
- A modernized monorepo track with a separate API server and a working mobile prototype

The main project-management challenge now is not lack of implementation; it is **alignment** between the legacy stack (`Backend` + `interface`) and the newer monorepo track (`Skill-Pulse-1`).

---

## 8) Folder Concept Map

### Root Folder Concepts
- `Backend`: Legacy API and business-logic core for auth, user profiles, skills, trends, and admin/public data endpoints.
- `interface`: Legacy admin web portal used to manage users, content, analytics, and settings.
- `Skill-Pulse-1`: New-generation monorepo that reorganizes API/mobile/shared libraries into a workspace architecture.
- `project_req`: Planning and requirement artifacts (documents and diagrams) used for scope and analysis.
- `README.md`: Legacy-stack architecture and setup guide.
- `WORKSPACE_BUILD_STATUS.md`: Current technical status snapshot of what is already built.

### Backend Folder Concepts
- `Backend/app.js`: Runtime composition layer that wires middleware, security, routes, health endpoint, and shutdown logic.
- `Backend/api.js`: Frontend-to-backend Axios bridge configuration for local API calls.
- `Backend/routes`: HTTP surface definition (what endpoints exist and what controllers/middleware are used).
- `Backend/controllers`: Domain behavior implementation for each route family.
- `Backend/models`: Data access abstractions and model-level persistence logic.
- `Backend/config`: Infrastructure configuration, especially database/supabase connection setup.
- `Backend/middleware`: Cross-cutting request pipeline logic (auth guards, validation, centralized error handling).
- `Backend/database`: SQL schema and migration scripts (persistent structure and seed evolution).
- `Backend/ai`: Independent AI/NLP service boundary (FastAPI + recommendation/generation endpoints).
- `Backend/node_modules`: Installed dependencies for backend runtime and tooling.

### Interface Folder Concepts
- `interface/src`: Application source for the admin portal.
- `interface/src/pages`: Route-level screens for user-facing admin features.
- `interface/src/components`: Reusable UI and layout primitives shared by pages.
- `interface/src/hooks`: State/data hooks that encapsulate frontend behavior and fetch logic.
- `interface/src/api`: API layer abstractions and client settings for server communication.
- `interface/src/utils`: Utility helpers for formatting, auth helpers, and shared non-UI logic.
- `interface/public`: Static assets served directly by Vite.
- `interface/index.html`: Web app host shell.
- `interface/tailwind.config.js`, `postcss.config.js`: Styling system configuration.
- `interface/vite.config.js`: Build/dev server configuration for the React app.

### Skill-Pulse-1 Folder Concepts
- `Skill-Pulse-1/artifacts`: Deployable application packages.
- `Skill-Pulse-1/artifacts/api-server`: New API server package (Express 5 + workspace libs).
- `Skill-Pulse-1/artifacts/mobile`: Expo mobile application package.
- `Skill-Pulse-1/artifacts/mockup-sandbox`: UI experimentation sandbox for design/prototype exploration.
- `Skill-Pulse-1/lib`: Shared reusable libraries consumed by artifact apps.
- `Skill-Pulse-1/lib/api-spec`: OpenAPI contract source of truth.
- `Skill-Pulse-1/lib/api-client-react`: Generated React client/hooks from API spec.
- `Skill-Pulse-1/lib/api-zod`: Generated runtime-validation schemas from API spec.
- `Skill-Pulse-1/lib/db`: Database package and ORM/schema integration layer.
- `Skill-Pulse-1/scripts`: Utility automation scripts executed as workspace tasks.
- `Skill-Pulse-1/attached_assets`: Prompt/context attachments used during rapid prototyping.
- `Skill-Pulse-1/pnpm-workspace.yaml`: Workspace package boundary definition.
- `Skill-Pulse-1/tsconfig.base.json`, `tsconfig.json`: TypeScript baseline and project-reference orchestration.

### Mobile App Internal Concepts
- `Skill-Pulse-1/artifacts/mobile/app`: Expo Router route tree and screen-level implementation.
- `Skill-Pulse-1/artifacts/mobile/components`: Mobile-shared UI components.
- `Skill-Pulse-1/artifacts/mobile/constants`: Theme, tokens, and fixed app-level configuration values.
- `Skill-Pulse-1/artifacts/mobile/data`: Local data models/mock/static content used by prototype screens.
- `Skill-Pulse-1/artifacts/mobile/assets`: Visual assets (icons, splash, images, branding files).
- `Skill-Pulse-1/artifacts/mobile/server`: Lightweight serving/build support for packaged previews.

### Conceptual Architecture Outcome
- Legacy track (`Backend` + `interface`) represents a traditional separated backend/admin-web stack.
- Monorepo track (`Skill-Pulse-1`) represents a productized multi-client platform where API/mobile/shared contracts are co-developed.
- The workspace currently functions as a transition state between these two architectural concepts.
