# NexaPath

NexaPath is a career development platform for IT learners and early-career professionals. It helps users identify skill gaps, explore market trends, and receive AI-powered career recommendations through a unified system combining a backend API, admin dashboard, AI runtime, and mobile application.

---

## Core Features

* AI-powered skill gap analysis
* Personalized career roadmaps and recommendations
* Market trends and role insights
* Admin dashboard for analytics and content management
* Mobile app for onboarding, tracking, and recommendations
* Real-time data integration with AI-enhanced outputs

---

## Tech Stack

* Backend: Node.js, Express
* Database: Supabase (PostgreSQL)
* AI Runtime: FastAPI, Ollama-compatible LLMs
* Admin Frontend: React + Vite
* Mobile App: Expo (React Native)
* Tooling: pnpm, Supabase CLI

---

## High-Level Architecture

```text
React Admin UI (Vite)  <---->  Express API  <---->  Supabase Postgres
                                                                 |
                                                                 +--------->  FastAPI AI Service (Ollama-compatible)
                                                                 |
                                                                 +--------->  Expo Mobile App
```

---

## Project Structure

```text
Backend/
    app.js
    config/
    controllers/
    routes/
    models/
    middleware/
    services/
    utils/
    database/schema.sql
    ai/
        backend.py
        tools.py
        scraper.py

interface/
    src/
    vite.config.js

mobile/
    artifacts/
        mobile/
        api-server/
    lib/
```

---

## Runtime Ports

| Service                  | Source                           | Default |
| ------------------------ | -------------------------------- | ------- |
| Backend API              | `Backend/app.js`                 | `4000`  |
| Admin UI                 | `interface/vite.config.js`       | `3000`  |
| AI Service               | `Backend/ai/backend.py`          | `8000`  |
| Mobile Expo              | `mobile/artifacts/mobile`        | `8081`  |
| Mobile Bridge (optional) | `mobile/artifacts/mobile/server` | `8082`  |

---

## Getting Started

### Prerequisites

* Node.js 18+
* Python 3.10+
* Supabase (or PostgreSQL)
* Ollama (optional, for local AI)
* pnpm

---

## Backend Setup

```bash
cd Backend
npm install
npm start
```

### Backend Environment (`Backend/.env`)

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=4000
NODE_ENV=development

JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

---

## AI Service Setup

```bash
cd Backend/ai
pip install -r requirements.txt
python backend.py
```

### AI Environment (Optional)

```env
AI_HOST=0.0.0.0
AI_PORT=8000

OLLAMA_URL=http://localhost:11434/v1
OLLAMA_MODEL=gemma3:1b
```

---

## Admin Interface

```bash
cd interface
npm install
npm run dev
```

### Frontend Environment (`interface/.env`)

```env
VITE_API_URL=http://localhost:4000
```

---

## Mobile App (Expo)

### Option 1 — From root

```powershell
.\run-mobile-expo.ps1 -Port 8081 -HostMode lan
```

### Option 2 — From mobile folder

```bash
cd mobile/artifacts/mobile
pnpm install
pnpm start
```

---

## Mobile Environment

Create:

```bash
mobile/artifacts/mobile/.env
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## API Overview

Base URL:

```
http://localhost:4000
```

### Main API Domains

* Auth: login, register, tokens, password reset
* User: profile, skills, dashboard, recommendations
* Skills: CRUD and categorization
* Trends: market insights and analysis
* Admin/Public: analytics, settings, user management

Full API documentation can be extended into a separate `docs/API.md`.

---

## Database

* Schema: `Backend/database/schema.sql`
* Backend uses Supabase service-role client
* AI runtime connects directly via `DATABASE_URL`

---

## AI System

The AI layer supports:

* Skill gap analysis
* Career roadmap generation
* Recommendation engine
* Market-aware insights
* Optional web scraping integration

It is powered through an OpenAI-compatible interface (Ollama by default).

---

## Development Notes

* Backend and AI service are loosely coupled
* Mobile and Admin share API contracts
* Some legacy naming (`SkillPulse`) may still exist internally
* Architecture is evolving toward a unified system

---

## Branding Note

The platform is now branded as NexaPath.
Some internal files and modules may still reference SkillPulse until migration is complete.

---

## Future Improvements

* Full RAG-based AI pipeline
* Unified monorepo structure
* Improved analytics dashboards
* Production deployment setup
* Enhanced mobile UX and onboarding

---

## License

This project is currently for academic and development purposes.
Add a license if you plan to make it public.

---
