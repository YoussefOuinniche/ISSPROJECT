# SkillPulse - Supabase Local Setup Guide

Complete guide to set up and run the SkillPulse project locally with Supabase.

---

## Prerequisites

Before starting, ensure you have the following installed:

- Node.js (v18 or higher)
- Docker Desktop (required for Supabase local)
- npm or yarn package manager

---

## Step 1: Start Docker Desktop

1. Open Docker Desktop application
2. Wait until Docker is fully running (whale icon in system tray should be steady)
3. Verify Docker is running with:
   ```bash
   docker --version
   ```

---

## Step 2: Start Local Supabase Server

From the project root directory:

```bash
npx supabase start
```

This command will:
- Pull required Docker images (first time only)
- Start PostgreSQL database
- Start Supabase API services
- Apply all migrations from `supabase/migrations/` folder
- Seed the database with initial data

Wait for the startup to complete. You should see output like:

```
Started supabase local development setup.

API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
```

IMPORTANT - Save these credentials:
- API URL: `http://127.0.0.1:54321`
- Anon Key: `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH`
- Service Role Key: (shown in terminal output)
- Database: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

---

## Step 3: Verify Database

Open Supabase Studio in browser:
```
http://127.0.0.1:54323
```

Navigate to:
- Table Editor - View all tables (users, profiles, skills, trends, etc.)
- SQL Editor - Run queries to verify data

Expected data counts:
- Users: 61
- Profiles: 61
- Skills: 289
- Trends: 78
- User Skills: 1,143
- Trend Skills: 469
- Skill Gaps: 420
- Recommendations: 493

Total: 3,014 records

---

## Step 4: Install Backend Dependencies

Navigate to Backend folder and install packages:

```bash
cd Backend
npm install
```

This installs:
- express - Web server
- @supabase/supabase-js - Supabase client
- cors - Cross-origin resource sharing
- dotenv - Environment variables
- bcryptjs - Password hashing (if needed)

---

## Step 5: Start Backend Server

From the Backend directory:

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

Backend will start on: `http://localhost:5000`

Available endpoints:
- GET `/test-db` - Test database connection
- GET `/api/users` - Get all users
- GET `/api/users/:userId/skills` - Get user skills
- GET `/api/users/:userId/recommendations` - Get user recommendations

---

## Step 6: Install Frontend Dependencies

Open a new terminal and navigate to interface folder:

```bash
cd interface
npm install
```

This installs:
- react & react-dom - UI framework
- react-router-dom - Routing
- vite - Build tool
- tailwindcss - Styling
- @supabase/supabase-js - Supabase client (if using direct connection)

---

## Step 7: Start Frontend Server

From the interface directory:

```bash
npm run dev
```

Frontend will start on: `http://localhost:3000`

Open in browser to see the application.

---

## Step 8: Test Login

Use any of these test accounts:

Email: `john.doe@example.com`
Password: `password123`

Email: `sarah.smith@example.com`
Password: `password123`

Email: `mike.johnson@example.com`
Password: `password123`

All 61 users in the database use password: `password123`

---

## Running Services Summary

After completing all steps, you should have:

1. Docker Desktop - Running in background
2. Supabase Server - `http://127.0.0.1:54321` (API) and `http://127.0.0.1:54323` (Studio)
3. Backend API - `http://localhost:5000`
4. Frontend App - `http://localhost:3000`

---

## Stopping the Services

To stop all services:

1. Stop Frontend: Press `Ctrl+C` in terminal running `npm run dev`
2. Stop Backend: Press `Ctrl+C` in terminal running `npm start`
3. Stop Supabase:
   ```bash
   npx supabase stop
   ```
4. Stop Docker Desktop: Close Docker Desktop application

---

## Restarting After Shutdown

To restart everything:

1. Start Docker Desktop
2. Run `npx supabase start` (data persists, very fast restart)
3. Run `npm start` in Backend folder
4. Run `npm run dev` in interface folder

Your data will still be there - no need to re-seed.

---

## Resetting Database (Clean Start)

If you need to reset the database to initial state:

```bash
npx supabase db reset
```

This will:
- Drop all tables
- Re-run all migrations
- Re-seed all data (3,014 records)

---

## Troubleshooting

### Supabase won't start
- Check if Docker Desktop is running
- Check if ports 54321, 54322, 54323 are available
- Run `npx supabase stop` then `npx supabase start`

### Backend connection errors
- Verify Supabase is running: `http://127.0.0.1:54323`
- Check `Backend/connect.js` has correct URL and key
- Test connection: `npm test` in Backend folder

### Frontend not connecting
- Verify backend is running on port 5000
- Check browser console for errors
- Verify `interface/src/supabaseClient.js` has correct credentials

### Port already in use
- Frontend port 3000 busy: Kill process or change port in vite.config.js
- Backend port 5000 busy: Kill process or change port in Backend/app.js
- Supabase ports busy: Stop other Supabase instances or change ports in `supabase/config.toml`

---

## Database Schema Overview

Tables and relationships:

```
users (61)
  ├── profiles (1:1 relationship)
  ├── user_skills (many-to-many with skills)
  ├── skill_gaps (one-to-many)
  └── recommendations (one-to-many)

skills (289)
  ├── user_skills (many-to-many with users)
  └── trend_skills (many-to-many with trends)

trends (78)
  └── trend_skills (many-to-many with skills)
```

All tables have proper foreign key constraints and cascade deletes.

---

## Development Tips

1. Use Supabase Studio (`http://127.0.0.1:54323`) to:
   - Browse tables and data
   - Run SQL queries
   - Test API endpoints
   - Monitor real-time subscriptions

2. Backend API testing:
   - Use Postman or curl for endpoint testing
   - Example: `curl http://localhost:5000/test-db`

3. Frontend development:
   - Vite supports hot reload - changes apply instantly
   - Check browser DevTools console for errors
   - Use React DevTools extension for component debugging

4. Database queries:
   - Use Supabase client for most operations (recommended)
   - Backend API for custom business logic
   - Direct PostgreSQL connection for advanced queries

---

## Project Structure

```
project-root/
├── Backend/
│   ├── connect.js          # Supabase client setup
│   ├── app.js              # Express server with API endpoints
│   ├── package.json        # Backend dependencies
│   └── .env.example        # Environment variables template
├── interface/
│   ├── src/
│   │   ├── main.jsx        # React entry point
│   │   ├── App.jsx         # Main app component
│   │   └── supabaseClient.js  # Frontend Supabase client
│   ├── package.json        # Frontend dependencies
│   └── vite.config.js      # Vite configuration
└── supabase/
    ├── config.toml         # Supabase configuration
    ├── migrations/         # Database migrations (schema + seed data)
    └── SETUP.md            # This file
```

---

## Next Steps

After setup is complete:

1. Explore the database in Supabase Studio
2. Test authentication with sample users
3. Browse user profiles and skills
4. Check skill gaps and recommendations
5. Explore trending technologies
6. Start implementing UI components

For more details on frontend integration patterns, see the Connection Setup documentation.
