# NexaPath — AI-Powered Upskilling Platform

NexaPath is a full-stack platform that helps users identify skill gaps, generate personalized learning roadmaps, and track career progress — powered by a local Ollama LLM (qwen2.5:7b).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend (Web)** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, React Query |
| **Backend API** | Node.js, Express 4, JWT, Helmet |
| **Database** | Supabase (PostgreSQL) |
| **AI Service** | Python 3.11+, FastAPI, asyncpg, httpx |
| **LLM** | Ollama · qwen2.5:7b (local inference) |
| **Mobile** | Expo / React Native (workspace in `mobile/`) |

---

## Folder Structure

```
ISSPROJECT/
├── ai/                        # Python FastAPI AI service (port 8000)
│   ├── backend.py             # FastAPI app entry point
│   ├── services/              # LLM service abstraction
│   ├── ai_chat_*              # Chat feature modules
│   ├── ai_roadmap_*           # Roadmap generation modules
│   ├── ai_skill_gap_*         # Skill gap analysis modules
│   ├── ai_profile_*           # Profile extraction modules
│   ├── trend_worker.py        # Background trend processing
│   └── requirements.txt       # Python dependencies
│
├── backend/                   # Node.js Express API (port 5000)
│   ├── src/
│   │   ├── server.js          # Entry point
│   │   ├── app.js             # Express app + routes
│   │   ├── controllers/       # Route handlers
│   │   ├── models/            # Supabase query models
│   │   ├── routes/            # Route definitions
│   │   ├── middlewares/       # Auth & validation middleware
│   │   └── utils/             # Shared utilities
│   ├── documentation/         # Backend API docs
│   └── .env                   # Backend config
│
├── frontend/                  # React + Vite web app (port 5173)
│   ├── src/
│   │   ├── pages/             # Route pages (Dashboard, AI Chat, Roadmaps…)
│   │   ├── component/         # Shared UI components
│   │   ├── lib/api.ts         # Axios services for backend + AI
│   │   └── constants/         # App constants + route definitions
│   └── .env                   # Frontend env vars
│
└── mobile/                    # Expo React Native app
    └── artifacts/
        └── mobile/            # Mobile app source
```

---

## Prerequisites

- **Node.js** 18+
- **Python** 3.11+
- **Ollama** — [install from ollama.com](https://ollama.com)
- A **Supabase** project (free tier works)

---

## Installation

### 1. Clone & install

```bash
git clone git@github.com:YoussefOuinniche/ISSPROJECT.git
cd ISSPROJECT
```

### 2. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5000
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
JWT_SECRET=change_this_in_production
JWT_EXPIRE=7d
ADMIN_EMAIL=admin@nexapath.com
ADMIN_API_KEY=your_admin_api_key
NODE_ENV=development
```

### 3. Frontend

```bash
cd frontend
npm install
```

`frontend/.env` (already committed):
```env
VITE_API_URL=http://localhost:5000/api
VITE_AI_URL=http://localhost:8000
```

### 4. AI Service

```bash
cd ai
pip install -r requirements.txt
```

`ai/.env` (already committed with safe defaults):
```env
AI_REQUIRE_AUTH=false
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_MODEL_CHAT=qwen2.5:7b
DATABASE_URL=postgresql://postgres:[password]@db.<project>.supabase.co:5432/postgres
```

### 5. Ollama

```bash
# Install Ollama from https://ollama.com, then:
ollama pull qwen2.5:7b
```

---

## Running the Project

Open **4 terminal tabs**:

```bash
# Tab 1 — Ollama LLM
ollama serve

# Tab 2 — Backend API
cd backend && npm run dev

# Tab 3 — AI Service
cd ai && uvicorn backend:app --reload --port 8000

# Tab 4 — Frontend
cd frontend && npm run dev
```

Then open: **http://localhost:5173**

Login credentials:
- Email: `admin@nexapath.com`
- Password: `issproject`

---

## Running on Mobile (Expo)

```bash
cd mobile
npm install   # or pnpm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android), or press `w` to open in browser.

The mobile app uses the same backend API. Make sure your backend `.env` has `FRONTEND_URL` set to your machine's local IP if testing on a real device.

---

## API Documentation

### Backend (Express · port 5000)

#### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/refresh-token` | Refresh JWT token |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

#### Admin (`/api/admin`) — requires `adminAuth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/stats` | Platform statistics |

#### Users (`/api/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

#### User (authenticated · `/api/user/*`) — requires `userAuth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/home` | User home dashboard data |
| GET | `/api/user/profile` | Get user profile |
| PUT/POST | `/api/user/profile` | Create or update profile |
| GET | `/api/user/skills` | Get user skills |
| POST | `/api/user/skills` | Add skill |
| PUT | `/api/user/skills/:skillId` | Update skill |
| DELETE | `/api/user/skills/:skillId` | Remove skill |
| GET | `/api/user/ai/history` | AI chat history |
| POST | `/api/user/ai/chat` | Send AI chat message |

#### Catalog & Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | `/api/categories` | Category CRUD |
| GET/POST/PUT/DELETE | `/api/skills` | Skill CRUD |
| GET | `/api/skills/trending` | Trending skills |
| GET/POST/PUT/DELETE | `/api/courses` | Course CRUD |
| GET/POST/PUT/DELETE | `/api/job-roles` | Job role CRUD |
| GET | `/api/job-roles/trending` | Trending job roles |

#### Learning & Progress

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | `/api/roadmaps` | Roadmap CRUD |
| PUT | `/api/roadmaps/:id/status` | Update roadmap status |
| PUT | `/api/roadmaps/steps/:stepId` | Update roadmap step |
| GET/POST/PUT/DELETE | `/api/progress` | Course progress |

#### Platform

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | `/api/chat` | Chat sessions & messages |
| GET/POST/PUT/DELETE | `/api/notifications` | Notification management |
| GET/POST/PUT/DELETE | `/api/plans` | Subscription plans |
| GET/POST/PUT | `/api/subscriptions` | Subscriptions |
| GET | `/api/market-trends` | Market trend data |
| GET | `/health` | Health check |

### AI Service (FastAPI · port 8000)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/ai/chat` | `{ user_id, message, recent_messages?, profile? }` | AI career coaching chat |
| POST | `/ai/generate-roadmap` | `{ role, user_profile? }` | Generate learning roadmap |
| POST | `/ai/skill-gap` | `{ role, user_profile? }` | Analyze skill gaps |
| POST | `/ai/extract-profile` | `{ text }` | Extract skills from resume text |
| GET | `/docs` | — | FastAPI Swagger UI |

**Supported roles for roadmap/skill-gap:**
`frontend_engineer`, `backend_engineer`, `full_stack_engineer`, `mobile_engineer`, `devops_engineer`, `cloud_engineer`, `platform_engineer`, `data_analyst`, `data_engineer`, `data_scientist`, `machine_learning_engineer`, `ai_engineer`, `mlops_engineer`, `cybersecurity_analyst`, `qa_automation_engineer`, `product_manager`, `technical_project_manager`

---

## Environment Variables Summary

### `backend/.env`
| Variable | Description |
|----------|-------------|
| `PORT` | Express server port (default: 5000) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend only) |
| `JWT_SECRET` | Secret for JWT signing |
| `JWT_EXPIRE` | Token expiry duration (e.g. `7d`) |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_API_KEY` | Admin API key |
| `FRONTEND_URL` | Frontend URL for CORS (production) |

### `frontend/.env`
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (default: http://localhost:5000/api) |
| `VITE_AI_URL` | AI service URL (default: http://localhost:8000) |

### `ai/.env`
| Variable | Description |
|----------|-------------|
| `AI_REQUIRE_AUTH` | Enable service token auth (false for dev) |
| `AI_SERVICE_TOKEN` | Bearer token if auth enabled |
| `OLLAMA_URL` | Ollama server URL |
| `OLLAMA_MODEL` | Default LLM model |
| `OLLAMA_MODEL_CHAT` | Model for chat |
| `OLLAMA_MODEL_EXTRACT` | Model for extraction |
| `AI_TIMEOUT_SECONDS` | LLM request timeout |
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_CORS_ORIGINS` | Comma-separated allowed origins |

---

## Features

- **Admin Dashboard** — real-time stats, charts, user & course management
- **AI Career Chat** — streaming conversation with NexaPath AI coach (local Ollama)
- **AI Roadmap Generator** — generate structured 3-stage learning paths for any role
- **Skill Gap Analysis** — compare current skills against target role requirements
- **User Authentication** — JWT-based register/login with token refresh
- **User Profile** — manage personal profile and skill assessments
- **Course & Skill Management** — full CRUD with Supabase
- **Learning Progress Tracking** — per-user course progress
- **Subscription Plans** — plan management with cancellation
- **Market Trends** — job market demand analytics
- **Dark / Light theme** — persisted preference

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit changes: `git commit -m "feat: add your feature"`
4. Push: `git push origin feat/your-feature`
5. Open a Pull Request

---

## License

MIT
