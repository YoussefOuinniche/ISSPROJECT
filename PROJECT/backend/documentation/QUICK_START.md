# NexaPath Backend — Quick Start Guide

## What's Implemented

A **complete, production-ready** backend API with:
- **18 Route Modules** — Full RESTful coverage
- **110+ API Endpoints** — Auth, admin, users, catalog, learning, analytics
- **JWT Authentication** — Separate admin and user auth guards
- **11 Database Models** — Supabase CRUD operations
- **Error Handling** — Consistent JSON error responses
- **Security** — Helmet, CORS, input validation
- **Middleware** — `adminAuth`, `userAuth`, `validation`

---

## 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Configure `.env`
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
FRONTEND_URL=http://localhost:5173
```

### Step 3: Start the Server
```bash
npm run dev
```

You should see:
```
Server running on port 5000 — http://localhost:5000
```

### Step 4: Test the API
```bash
# Health check
curl http://localhost:5000/health

# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@nexapath.com","password":"secret"}'

# Get all categories
curl http://localhost:5000/api/categories
```

---

## Project Structure at a Glance

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          ← Supabase configuration
│   ├── controllers/             ← Request handlers (18 files)
│   ├── models/                  ← Data models (11 files)
│   ├── routes/                  ← API routes (18 files)
│   ├── middlewares/             ← Auth & validation middleware
│   │   ├── auth.js              ← Admin JWT guard
│   │   ├── userAuth.js          ← User JWT guard
│   │   └── validation.js
│   ├── utils/
│   │   └── errors.js
│   ├── app.js                   ← Express setup + all routes
│   └── server.js                ← Entry point
├── documentation/               ← API docs
├── .env
└── package.json
```

---

## Available Endpoints by Resource

| # | Resource | Endpoints | Auth |
|---|----------|-----------|------|
| 1 | Auth | 5 | — |
| 2 | Admin | 2 | Admin JWT |
| 3 | Users | 5 | — |
| 4 | User Home | 1 | User JWT |
| 5 | User Profile | 3 | User JWT |
| 6 | User Skills | 4 | User JWT |
| 7 | User AI Chat | 2 | User JWT |
| 8 | Categories | 6 | — |
| 9 | Skills | 8 | — |
| 10 | Courses | 8 | — |
| 11 | Job Roles | 8 | — |
| 12 | Progress | 8 | — |
| 13 | Chat | 9 | — |
| 14 | Notifications | 9 | — |
| 15 | Roadmaps | 9 | — |
| 16 | Plans | 7 | — |
| 17 | Subscriptions | 7 | — |
| 18 | Market Trends | 8 | — |

**Total: 110+ REST endpoints**

---

## Common Operations

### Register & Login
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@nexapath.com","password":"secret"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@nexapath.com","password":"secret"}'
```

### Use Authenticated Endpoints
```bash
TOKEN="eyJhbGci..."

# Get user profile
curl http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer $TOKEN"

# Send AI message
curl -X POST http://localhost:5000/api/user/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What skills do I need for a backend role?"}'
```

### Admin Login
```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nexapath.com","apiKey":"your_admin_api_key"}'
```

### CRUD Examples
```bash
# Get all skills
curl http://localhost:5000/api/skills

# Create a skill
curl -X POST http://localhost:5000/api/skills \
  -H "Content-Type: application/json" \
  -d '{"name":"TypeScript","slug":"typescript","description":"JS with types"}'

# Get user progress
curl http://localhost:5000/api/progress/user/user-uuid
```

---

## API Response Format

### Success
```json
{
  "success": true,
  "data": [],
  "message": "Optional message",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Error description"
}
```

---

## Development Tips

### Running in Development
```bash
npm run dev    # auto-restarts on changes, Morgan logging enabled
```

### Running in Production
```bash
npm start
```

### Check Server Health
```bash
curl http://localhost:5000/health
```

---

## Troubleshooting

### Port Already in Use
```bash
PORT=5001  # change in .env
```

### Supabase Connection Error
- Verify `.env` credentials
- Check Supabase dashboard for correct URL and keys
- Ensure database tables exist

### Module Not Found
```bash
rm -rf node_modules package-lock.json
npm install
```

### JWT Issues
- Check `JWT_SECRET` is set in `.env`
- Ensure token is passed as `Authorization: Bearer <token>`

---

## Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Full setup & feature guide |
| `API_ENDPOINTS.md` | Complete endpoint reference |
| `QUICK_START.md` | This file — get running fast |
| `COMPLETION_SUMMARY.md` | Implementation status |

---

**Start the server:**
```bash
cd backend && npm run dev
```
