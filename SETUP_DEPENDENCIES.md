# Setup Dependencies

This repository has two active tracks:

- Legacy stack: `Backend` + `Backend/ai` + `interface`
- Monorepo track: `Skill-Pulse-1` with Expo mobile and shared packages

## Tooling Baseline

These versions work in the current workspace:

- Node.js: `v24.12.0`
- npm: `11.6.2`
- pnpm: `10.28.1`
- Python: `3.12.9`
- Ollama: `0.20.0`

Practical minimums:

- Node.js `18+`
- Python `3.10+`
- Ollama installed locally

## 1. Backend API Dependencies

The Express API in `Backend` uses `npm`.

```bash
cd Backend
npm install
```

Main runtime packages come from [Backend/package.json](./Backend/package.json), including:

- `express`
- `axios`
- `cors`
- `helmet`
- `jsonwebtoken`
- `@supabase/supabase-js`
- `sequelize`
- `pg`

Start it with:

```bash
cd Backend
npm start
```

## 2. AI Service Dependencies

The FastAPI AI service in `Backend/ai` uses Python packages from [Backend/ai/requirements.txt](./Backend/ai/requirements.txt).

Create and activate a virtual environment, then install:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r Backend/ai/requirements.txt
```

Important Python packages:

- `fastapi`
- `uvicorn[standard]`
- `psycopg2-binary`
- `asyncpg`
- `python-dotenv`
- `requests`
- `httpx`
- `beautifulsoup4`
- `pandas`
- `matplotlib`

Start it with:

```bash
cd Backend/ai
python backend.py
```

## 3. Admin Frontend Dependencies

The web admin app in `interface` also uses `npm`.

```bash
cd interface
npm install
```

Start it with:

```bash
cd interface
npm run dev
```

## 4. Monorepo / Mobile Dependencies

The `Skill-Pulse-1` workspace uses `pnpm`, not `npm`.

```bash
cd Skill-Pulse-1
pnpm install
```

This installs workspace packages for:

- `artifacts/mobile`
- `artifacts/api-server`
- `lib/api-client-react`
- `lib/api-zod`
- `lib/db`

Start the Expo mobile app with either:

```bash
.\run-mobile-expo.ps1 -Port 8081 -HostMode lan
```

or:

```bash
cd Skill-Pulse-1/artifacts/mobile
pnpm run start
```

## 5. Ollama Model To Pull

The current backend environment in [Backend/.env](./Backend/.env) is configured for:

- `OLLAMA_MODEL=qwen2.5:3b`
- `OLLAMA_MODEL_CHAT=qwen2.5:3b`
- `OLLAMA_MODEL_EXTRACT=qwen2.5:3b`

Pull that model locally:

```bash
ollama pull qwen2.5:3b
```

Then make sure Ollama is running:

```bash
ollama serve
```

The AI service expects Ollama at:

```env
OLLAMA_URL=http://127.0.0.1:11434/v1
```

## 6. Required Environment

At minimum, the backend needs a valid `Backend/.env` with:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `PORT=4000`
- `AI_SERVICE_URL=http://127.0.0.1:8000`
- `AI_SERVICE_TOKEN=skillpulse-local-ai-token`

For the web frontend:

- `interface/.env`
- `VITE_API_URL=http://localhost:4000`

## 7. Recommended Startup Order

If you want the full app stack working locally:

1. Start `ollama serve`
2. Start `Backend/ai/backend.py`
3. Start `Backend/app.js`
4. Start `interface` or Expo mobile

## 8. Push Notes

- Do not commit `.env` secrets.
- Do not commit `.venv`, `node_modules`, or Expo build artifacts.
- If GitHub Actions or another machine will run this repo, it must also install:
  - Node dependencies in `Backend`
  - Node dependencies in `interface`
  - `pnpm` workspace dependencies in `Skill-Pulse-1`
  - Python dependencies from `Backend/ai/requirements.txt`
  - Ollama model `qwen2.5:3b`
