# SkillPulse — AI-Powered Career Development & Upskilling Platform

## Overview

SkillPulse bridges the gap between IT students, junior professionals, and the evolving job market. The platform leverages AI to analyze user profiles, identify skill gaps, and deliver personalized learning pathways aligned with current industry demands.

---

## Architecture

```
┌─────────────────────┐     REST API      ┌──────────────────────┐
│   React Admin UI    │ ◄───────────────► │  Node.js / Express   │
│  (Vite + Tailwind)  │                   │     Backend API       │
└─────────────────────┘                   └──────────┬───────────┘
                                                     │
                                          ┌──────────▼───────────┐
                                          │     PostgreSQL DB     │
                                          └──────────────────────┘
                                                     │
                                          ┌──────────▼───────────┐
                                          │  Python FastAPI (AI)  │
                                          │  RAG · TF-IDF · LLM  │
                                          └──────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Admin Frontend** | React 18, Vite, Tailwind CSS, React Router v6, Axios |
| **Backend API** | Node.js, Express 4, CommonJS |
| **Database** | PostgreSQL (via `pg` driver) |
| **Authentication** | JWT (`jsonwebtoken`), bcrypt password hashing |
| **Validation** | `express-validator` |
| **AI Service** | Python 3, FastAPI, Uvicorn |
| **RAG / NLP** | `scikit-learn` TF-IDF, `pypdf`, DuckDuckGo search fallback |
| **LLM Interface** | OpenAI-compatible client (Ollama local LLM) |

---

## Project Structure

```
├── Backend/
│   ├── app.js                  # Express entry point (port 5000)
│   ├── config/
│   │   └── database.js         # PostgreSQL pool (mock fallback for dev)
│   ├── routes/
│   │   ├── Auth.js             # /api/auth
│   │   ├── User.js             # /api/user
│   │   ├── Skills.js           # /api/skills
│   │   ├── Trends.js           # /api/trends
│   │   └── Public.js           # /api/public
│   ├── controllers/            # Route handler logic
│   ├── models/                 # DB model helpers
│   ├── middleware/             # auth, errorHandler, validate
│   ├── database/
│   │   └── schema.sql          # PostgreSQL schema
│   └── ai/
│       ├── backend.py          # FastAPI AI service
│       ├── rag.py              # RAG pipeline
│       ├── requirements.txt    # Python dependencies
│       └── Articles/           # Knowledge base documents
└── interface/
    ├── src/
    │   ├── pages/              # Dashboard, Analytics, Users, Settings, etc.
    │   ├── components/         # Shared UI components
    │   ├── api.js              # Axios API client
    │   └── App.jsx             # Router root
    └── vite.config.js
```

---

## API Endpoints

### Authentication — `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Register new user |
| POST | `/login` | Login and receive JWT |
| POST | `/refresh-token` | Refresh access token |
| POST | `/forgot-password` | Send password reset email |
| POST | `/reset-password` | Reset with token |
| GET | `/me` | Get current user (protected) |
| POST | `/logout` | Invalidate session (protected) |

### User — `/api/user` *(all protected)*
| Method | Path | Description |
|---|---|---|
| GET/PUT/POST | `/profile` | Get or upsert user profile |
| PUT | `/update` | Update account details |
| DELETE | `/account` | Delete account |
| GET/POST | `/skills` | List or add user skills |
| PUT/DELETE | `/skills/:skillId` | Update or remove a skill |
| GET | `/skill-gaps` | Computed skill gap analysis |
| GET | `/recommendations` | Personalized learning recommendations |
| GET | `/dashboard` | Aggregated dashboard data |

### Skills — `/api/skills`
| Method | Path | Access |
|---|---|---|
| GET | `/` `/search` `/categories` `/:id` `/:id/stats` | Public |
| POST/PUT/DELETE | `/` `/bulk` `/:id` | Admin (protected) |

### Trends — `/api/trends`
| Method | Path | Access |
|---|---|---|
| GET | `/` `/recent` `/search` `/domains` `/:id` | Public |
| POST/PUT/DELETE | `/` `/bulk` `/:id` | Admin (protected) |

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14
- Python ≥ 3.10
- Ollama (for local LLM inference)

### 1. Database Setup
```sql
-- Run the schema
psql -U <user> -d <dbname> -f Backend/database/schema.sql
```

### 2. Backend API
```bash
cd Backend
cp .env.example .env      # configure DATABASE_URL, JWT_SECRET, etc.
npm install
npm start                  # runs on http://localhost:5000
```

Required `.env` variables:
```
DATABASE_URL=postgresql://user:password@localhost:5432/skillpulse
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### 3. AI Service
```bash
cd Backend/ai
pip install -r requirements.txt
uvicorn backend:app --reload --port 8000
```

### 4. Admin Frontend
```bash
cd interface
npm install
npm run dev                # runs on http://localhost:5173
```

---

## Core Features

### Intelligent Profile Analysis
- Skills taxonomy across programming languages, frameworks, databases, cloud platforms, and DevOps tools
- User skill self-assessment and gap computation

### Job Market Intelligence
- Trending skills tracking by domain
- Skill demand analytics across the user base

### AI-Powered Recommendations
- RAG pipeline combining local PDF articles with DuckDuckGo web search
- TF-IDF cosine similarity for document retrieval
- Ollama-backed LLM response generation

### Admin Dashboard
- User management and analytics
- Skill and trend CRUD management
- Platform-wide learning pathway analytics

---

## Health Check

```
GET /health
→ { "success": true, "database": "connected", "timestamp": "..." }
```

### Pause Detection And Monitoring

Run these from the `Backend` folder:

```bash
npm run db:status
```

What it checks:
- DNS resolution for the `SUPABASE_URL` host
- Supabase REST API reachability
- Credential validity using `SUPABASE_SERVICE_ROLE_KEY`
- Basic schema/table probe on `users` (or `DB_HEALTH_TABLE`)

For local or remote endpoint checks:

```bash
npm run healthcheck
```

Optional environment overrides:
- `HEALTHCHECK_URL` (default `http://localhost:4000/health`)
- `HEALTHCHECK_TIMEOUT_MS` (default `15000`)
- `HEALTHCHECK_EXPECT_DB` (default `true`)

GitHub Actions monitor:
- Workflow file: `.github/workflows/health-monitor.yml`
- Schedule: every 10 minutes
- Required secret: `HEALTHCHECK_URL` (your deployed backend health endpoint)

---

## Keywords

AI-powered upskilling · career development · skill gap analysis · personalized learning pathways · IT workforce development · RAG · PostgreSQL · FastAPI · React · Node.js
