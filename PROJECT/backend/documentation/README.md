# NexaPath Backend API

A comprehensive REST API for the NexaPath AI-powered upskilling platform, built with Express.js and Supabase.

## Features

- **Authentication** — JWT register/login with token refresh
- **User Management** — profiles, skills, and personalized home data
- **Course Management** — create, update, and manage courses with difficulty levels
- **Job Roles & Categories** — browse job roles organized by categories
- **User Progress Tracking** — track learning progress across courses
- **Chat Sessions** — manage user conversation history with AI
- **Notifications** — send and manage user notifications
- **Market Trends** — monitor job market trends and demand
- **Subscriptions & Plans** — manage subscription plans and user subscriptions
- **Learning Roadmaps** — generate and manage personalized learning roadmaps
- **Admin Dashboard** — protected admin endpoints with stats
- **Scalable Architecture** — built with Express.js and Supabase

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account with database setup

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:
```bash
cp .env.example .env
```

Fill in your Supabase credentials:
```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
ADMIN_EMAIL=admin@nexapath.com
ADMIN_API_KEY=your_admin_api_key
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

3. **Run the server**:

**Development** (with auto-reload):
```bash
npm run dev
```

**Production**:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
- `GET /health` — Server health status

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — User login (returns JWT)
- `POST /api/auth/refresh-token` — Refresh access token
- `GET /api/auth/me` — Get currently authenticated user
- `POST /api/auth/logout` — Logout

### Admin (`/api/admin`) — admin-only
- `POST /api/admin/login` — Admin login
- `GET /api/admin/stats` — Platform statistics (protected)

### Users (`/api/users`)
- `GET /api/users` — Get all users
- `GET /api/users/:id` — Get user by ID
- `POST /api/users` — Create user
- `PUT /api/users/:id` — Update user
- `DELETE /api/users/:id` — Delete user

### User (authenticated · `/api/user/*`)
- `GET /api/user/home` — Home dashboard data
- `GET /api/user/profile` — Get user profile
- `PUT /api/user/profile` — Update user profile
- `POST /api/user/profile` — Create user profile
- `GET /api/user/skills` — Get user skills
- `POST /api/user/skills` — Add skill to user
- `PUT /api/user/skills/:skillId` — Update user skill
- `DELETE /api/user/skills/:skillId` — Remove user skill
- `GET /api/user/ai/history` — AI chat history
- `POST /api/user/ai/chat` — Send AI chat message

### Categories (`/api/categories`)
- `GET /api/categories` — Get all categories
- `GET /api/categories/:id` — Get category by ID
- `GET /api/categories/slug/:slug` — Get category by slug
- `POST /api/categories` — Create category (admin)
- `PUT /api/categories/:id` — Update category (admin)
- `DELETE /api/categories/:id` — Delete category (admin)

### Skills (`/api/skills`)
- `GET /api/skills` — Get all skills with filtering
- `GET /api/skills/trending` — Get trending skills
- `GET /api/skills/:id` — Get skill by ID
- `GET /api/skills/slug/:slug` — Get skill by slug
- `GET /api/skills/user/:profileId` — Get user's skills
- `POST /api/skills` — Create skill (admin)
- `PUT /api/skills/:id` — Update skill (admin)
- `DELETE /api/skills/:id` — Delete skill (admin)

### Courses (`/api/courses`)
- `GET /api/courses` — Get all courses (paginated)
- `GET /api/courses/stats` — Get course statistics
- `GET /api/courses/:id` — Get course by ID
- `GET /api/courses/slug/:slug` — Get course by slug
- `GET /api/courses/category/:categoryId` — Get courses by category
- `POST /api/courses` — Create course (admin)
- `PUT /api/courses/:id` — Update course (admin)
- `DELETE /api/courses/:id` — Delete course (admin)

### Job Roles (`/api/job-roles`)
- `GET /api/job-roles` — Get all job roles
- `GET /api/job-roles/trending` — Get trending job roles
- `GET /api/job-roles/:id` — Get job role by ID
- `GET /api/job-roles/slug/:slug` — Get job role by slug
- `GET /api/job-roles/category/:categoryId` — Get roles by category
- `POST /api/job-roles` — Create job role (admin)
- `PUT /api/job-roles/:id` — Update job role (admin)
- `DELETE /api/job-roles/:id` — Delete job role (admin)

### Progress (`/api/progress`)
- `GET /api/progress` — Get all progress entries (admin)
- `GET /api/progress/user/:profileId` — Get user's course progress
- `GET /api/progress/user/:profileId/stats` — Get user progress statistics
- `GET /api/progress/:profileId/:courseId` — Get specific course progress
- `POST /api/progress/:profileId/:courseId/start` — Start a course
- `PUT /api/progress/:profileId/:courseId` — Update course progress
- `POST /api/progress/:profileId/:courseId/complete` — Complete a course
- `DELETE /api/progress/:id` — Delete progress entry

### Chat (`/api/chat`)
- `GET /api/chat/sessions/:profileId` — Get user's chat sessions
- `POST /api/chat/sessions/:profileId` — Create chat session
- `GET /api/chat/:sessionId` — Get session by ID with messages
- `GET /api/chat/:sessionId/messages` — Get session messages
- `POST /api/chat/:sessionId/messages` — Add message to session
- `GET /api/chat/:sessionId/search` — Search messages
- `PUT /api/chat/:sessionId` — Update session
- `POST /api/chat/:sessionId/archive` — Archive session
- `DELETE /api/chat/:sessionId` — Delete session

### Notifications (`/api/notifications`)
- `GET /api/notifications/:profileId` — Get user notifications
- `GET /api/notifications/:profileId/unread` — Get unread count
- `GET /api/notifications/:profileId/stats` — Get notification statistics
- `GET /api/notifications/:id` — Get notification by ID
- `POST /api/notifications` — Create notification
- `PUT /api/notifications/:id/read` — Mark as read
- `PUT /api/notifications/:profileId/mark-all-read` — Mark all as read
- `DELETE /api/notifications/:id` — Delete notification
- `DELETE /api/notifications/:profileId/delete-read` — Delete all read

### Roadmaps (`/api/roadmaps`)
- `GET /api/roadmaps` — Get all roadmaps (admin)
- `GET /api/roadmaps/stats` — Get roadmap statistics
- `GET /api/roadmaps/:id` — Get roadmap by ID
- `GET /api/roadmaps/user/:profileId` — Get user's roadmaps
- `GET /api/roadmaps/:roadmapId/steps` — Get roadmap steps
- `POST /api/roadmaps` — Create roadmap
- `PUT /api/roadmaps/:id/status` — Update roadmap status
- `PUT /api/roadmaps/steps/:stepId` — Update roadmap step
- `DELETE /api/roadmaps/:id` — Delete roadmap

### Plans (`/api/plans`)
- `GET /api/plans` — Get all plans
- `GET /api/plans/active` — Get active plans
- `GET /api/plans/:id` — Get plan by ID
- `GET /api/plans/slug/:slug` — Get plan by slug
- `POST /api/plans` — Create plan (admin)
- `PUT /api/plans/:id` — Update plan (admin)
- `DELETE /api/plans/:id` — Delete plan (admin)

### Subscriptions (`/api/subscriptions`)
- `GET /api/subscriptions` — Get all subscriptions (admin)
- `GET /api/subscriptions/stats` — Get subscription statistics
- `GET /api/subscriptions/expiring` — Get expiring subscriptions
- `GET /api/subscriptions/:id` — Get subscription by ID
- `GET /api/subscriptions/user/:profileId` — Get user subscription
- `POST /api/subscriptions` — Create subscription
- `PUT /api/subscriptions/:id/cancel` — Cancel subscription

### Market Trends (`/api/market-trends`)
- `GET /api/market-trends` — Get all market trends
- `GET /api/market-trends/trending` — Get trending job roles
- `GET /api/market-trends/declining` — Get declining job roles
- `GET /api/market-trends/stable` — Get stable job roles
- `GET /api/market-trends/market/stats` — Get market statistics
- `GET /api/market-trends/:id` — Get trend by ID
- `GET /api/market-trends/role/:jobRoleId` — Get trend by job role
- `POST /api/market-trends` — Create/update trend (admin)

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js              # Supabase configuration
│   ├── controllers/                 # Request handlers (18 files)
│   │   ├── authController.js
│   │   ├── admincontroller.js
│   │   ├── usercontroller.js
│   │   ├── userHomeController.js
│   │   ├── userProfileController.js
│   │   ├── userSkillsController.js
│   │   ├── userAiController.js
│   │   ├── categoryController.js
│   │   ├── skillController.js
│   │   ├── courseController.js
│   │   ├── jobRoleController.js
│   │   ├── progressController.js
│   │   ├── chatController.js
│   │   ├── notificationController.js
│   │   ├── roadmapcontroller.js
│   │   ├── plancontroller.js
│   │   ├── subscriptionController.js
│   │   └── jobMarketTrendController.js
│   ├── models/                      # Data models (11 files)
│   ├── routes/                      # API routes (18 files)
│   ├── middlewares/                 # Auth & validation
│   │   ├── auth.js                  # Admin JWT middleware
│   │   ├── userAuth.js              # User JWT middleware
│   │   └── validation.js            # Input validation helpers
│   ├── utils/
│   │   └── errors.js                # Error utilities
│   ├── app.js                       # Express app configuration
│   └── server.js                    # Server entry point
├── documentation/                   # API documentation
├── .env                             # Environment variables
└── package.json                     # Dependencies
```

## Architecture

### Models Pattern
Each model provides CRUD operations and domain-specific queries interfacing with Supabase:

```javascript
class Entity {
  static async findAll(filters) { }
  static async findById(id) { }
  static async create(data) { }
  static async update(id, data) { }
  static async delete(id) { }
}
```

### Controller Pattern
Controllers handle HTTP requests/responses and delegate business logic to models:

```javascript
const getEntity = async (req, res) => {
  try {
    const data = await Model.findById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### Middleware
- `adminAuth` — verifies admin JWT, applied to `/api/admin/stats` and other admin-only routes
- `userAuth` — verifies user JWT, applied to all `/api/user/*` routes

## Database Schema

The backend uses Supabase PostgreSQL with the following main tables:

- `profiles` — User profiles linked to Supabase auth
- `categories` — Skill and course categories
- `skills` — Available skills
- `courses` — Training courses
- `job_roles` — Career positions
- `user_skills` — User skill assessments
- `user_progress` — Course progress tracking
- `ai_roadmaps` — Personalized learning paths
- `ai_roadmap_steps` — Roadmap milestones
- `subscriptions` — User subscription records
- `plans` — Subscription plans
- `chat_sessions` — Conversation sessions
- `chat_messages` — Message history
- `notifications` — User notifications
- `job_market_trends` — Market demand data

## Error Handling

All endpoints return JSON responses with the following structure:

**Success**:
```json
{
  "success": true,
  "data": { },
  "message": "Operation successful"
}
```

**Error**:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | Environment (development/production) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRE` | JWT expiration time (e.g. `7d`) |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_API_KEY` | Admin API key |
| `FRONTEND_URL` | Frontend URL for CORS |

## Security

- **Helmet.js** — HTTP headers security
- **CORS** — Configurable allowed origins
- **JWT Middleware** — Separate admin and user auth guards
- **Environment Variables** — Sensitive data protection
- **Input Validation** — Data validation in controllers
- **Database RLS** — Row-level security in Supabase

## License

MIT
