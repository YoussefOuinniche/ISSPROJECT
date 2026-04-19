# NexaPath

NexaPath is a career development platform for IT learners and early-career professionals. This repository currently contains the active backend, admin interface, AI runtime, and mobile app artifacts used in this workspace.

## What Is Up To Date In This README

This README reflects the current code paths, ports, and scripts as of April 2026.

## High-Level Architecture

```text
React Admin UI (Vite)  <---->  Express API  <---->  Supabase Postgres
                                                                 |
                                                                 +--------->  FastAPI AI Service (Ollama-compatible)
                                                                 |
                                                                 +--------->  Expo Mobile App
```

## Runtime Port Map

| Service | Source | Env | Default |
|---|---|---|---|
| Backend API | `Backend/app.js` | `PORT` | `4000` |
| Admin frontend | `interface/vite.config.js` | `VITE_WEB_PORT` | `3000` |
| AI service | `Backend/ai/backend.py` | `AI_HOST`, `AI_PORT` | `0.0.0.0:8000` |
| Mobile Expo dev server | `run-mobile-expo.ps1`, `mobile/artifacts/mobile/scripts/start-local.js` | `MOBILE_PORT` / `PORT` | `8081` |
| Mobile static bridge (optional) | `mobile/artifacts/mobile/server/serve.js` | `MOBILE_BRIDGE_PORT` / `PORT` | `8082` |

## Project Layout

```text
Backend/
    app.js
    config/database.js
    routes/
    controllers/
    models/
    middleware/
    services/
    utils/
    database/schema.sql
    ai/
        backend.py
        tools.py
        scraper.py
        requirements.txt

interface/
    src/
    vite.config.js

mobile/
    artifacts/
        api-server/
        mobile/
    lib/
```

## API Surface (Legacy Backend + Current Mobile Bridge)

Base URL: `http://localhost:4000`

### Health
- `GET /health`

### Auth (`/api/auth`)
- `POST /register`
- `POST /login`
- `POST /refresh-token`
- `POST /forgot-password`
- `POST /reset-password`
- `POST /change-password` (protected)
- `GET /me` (protected)
- `POST /logout` (protected)

### User (`/api/user`, protected)
- `GET /profile`
- `PUT /profile`
- `POST /profile`
- `POST /profile/recompute`
- `PUT /update`
- `DELETE /account`
- `GET /skills`
- `POST /skills`
- `PUT /skills/:skillId`
- `DELETE /skills/:skillId`
- `GET /skill-gaps`
- `GET /recommendations`
- `GET /dashboard`
- `GET /countries`
- `GET /roles`
- `GET /roles/:slug/market`
- `GET /market-trends/global`
- `GET /market-trends/role`
- `GET /market-insights`
- `POST /market-trends/refresh`
- `POST /ai/skill-gaps/analyze`
- `POST /ai/roadmap`
- `POST /ai/recommendations/generate`
- `POST /ai/career-advice`
- `POST /ai/job-description`
- `POST /ai/role-snapshot`

### Skills (`/api/skills`)
Public:
- `GET /`
- `GET /search`
- `GET /categories`
- `GET /:id`
- `GET /:id/stats`

Protected:
- `POST /`
- `POST /bulk`
- `PUT /:id`
- `DELETE /:id`

### Trends (`/api/trends`)
Public:
- `GET /`
- `GET /recent`
- `GET /search`
- `GET /domains`
- `GET /:id`

Protected:
- `POST /`
- `POST /bulk`
- `PUT /:id`
- `DELETE /:id`

### Public/Admin (`/api/public`)
Public:
- `GET /dashboard`

Admin protected:
- `GET /admin/users`
- `PATCH /admin/users/:id`
- `DELETE /admin/users/:id`
- `GET /admin/content`
- `GET /admin/analytics`
- `GET /admin/overview`
- `POST /admin/profile/recompute`
- `GET /admin/settings`
- `PATCH /admin/settings`
- `GET /admin/account`
- `PATCH /admin/account`
- `GET /admin/notifications`
- `POST /admin/notifications/read-all`

## Local Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL 14+ or Supabase Postgres
- Ollama if using a local LLM
- pnpm for the mobile workspace

### 1. Backend API

```bash
cd Backend
npm install
npm start
```

Minimum backend env in `Backend/.env`:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000,http://127.0.0.1:3000

JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d
RESET_PASSWORD_EXPIRE=3600000
```

Optional backend env:

```env
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TOKEN=change-this-ai-service-token
AI_TIMEOUT_MS=15000
AI_HEALTH_TIMEOUT_MS=2500
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin-password
```

### 2. AI Service

```bash
cd Backend/ai
pip install -r requirements.txt
python backend.py
```

The AI service loads `Backend/.env` first, then `Backend/ai/.env` as an override layer.

Recommended AI env:

```env
AI_HOST=0.0.0.0
AI_PORT=8000
AI_RELOAD=true

AI_REQUIRE_AUTH=true
AI_SERVICE_TOKEN=change-this-ai-service-token
AI_CORS_ORIGINS=

OLLAMA_URL=http://localhost:11434/v1
OLLAMA_MODEL=gemma3:1b
OLLAMA_API_KEY=ollama
AI_TEMPERATURE=0.7
AI_TIMEOUT_SECONDS=300

DATABASE_URL=postgresql://...
AI_SCRAPER_TIMEOUT=15
```

AI endpoints:
- `GET /health`
- `POST /analyze-skill-gaps`
- `POST /generate-roadmap`
- `POST /recommend`
- `POST /career-advice`
- `POST /generate-job-description`
- `GET /models`

### 3. Admin Frontend

```bash
cd interface
npm install
npm run dev
```

Frontend env in `interface/.env`:

```env
VITE_WEB_PORT=3000
VITE_API_URL=http://localhost:4000
```

### 4. Mobile App

Expo dev server from repo root:

```powershell
.\run-mobile-expo.ps1 -Port 8081 -HostMode lan
```

`HostMode` supports `lan`, `localhost`, or `tunnel`.

Alternative from inside the mobile package:

```bash
cd mobile/artifacts/mobile
pnpm install
pnpm run start
```

Static mobile bridge:

```bash
cd mobile/artifacts/mobile
pnpm run build
pnpm run serve
```

## Database Notes

- Canonical SQL schema lives in `Backend/database/schema.sql`.
- Backend runtime DB access uses `Backend/config/database.js` through the Supabase service-role client.
- AI runtime reads direct Postgres through `DATABASE_URL` in `Backend/ai/backend.py`.

## Feature Notes

Current AI runtime is prompt orchestration with:
- user, profile, skills, and trends retrieval from the database
- live web scraping inputs through `tools.py` and `scraper.py`
- structured JSON generation through an OpenAI-compatible endpoint, typically Ollama

There is no standalone `rag.py` module in the current `Backend/ai` folder.

## Branding Note

The product is now branded as `NexaPath`. Some legacy internal filenames, generated clients, or older folder references may still contain `SkillPulse` naming until they are fully migrated.
