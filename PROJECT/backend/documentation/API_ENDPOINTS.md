# NexaPath API Endpoints Reference

## Base URL
```
http://localhost:5000/api
```

## Status Codes
- `200` — Success
- `201` — Created
- `400` — Bad Request
- `401` — Unauthorized
- `404` — Not Found
- `500` — Server Error

---

## HEALTH CHECK

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health status |

---

## AUTH (`/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Register new user | — |
| POST | `/login` | Login and get JWT | — |
| POST | `/refresh-token` | Refresh access token | — |
| GET | `/me` | Get current user | User |
| POST | `/logout` | Logout | User |

**Register / Login body:**
```json
{ "email": "user@example.com", "password": "secret" }
```

---

## ADMIN (`/admin`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/login` | Admin login | — |
| GET | `/stats` | Platform statistics | Admin |

---

## USERS (`/users`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all users | — |
| GET | `/:id` | Get user by ID | — |
| POST | `/` | Create user | — |
| PUT | `/:id` | Update user | — |
| DELETE | `/:id` | Delete user | — |

---

## USER — Authenticated (`/user/*`) — requires Bearer token

### Home

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/home` | Home dashboard data |

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/profile` | Get user profile |
| PUT | `/user/profile` | Update user profile |
| POST | `/user/profile` | Create user profile |

### Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/skills` | Get user's skills |
| POST | `/user/skills` | Add skill |
| PUT | `/user/skills/:skillId` | Update skill |
| DELETE | `/user/skills/:skillId` | Remove skill |

### AI Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/ai/history` | Get AI chat history |
| POST | `/user/ai/chat` | Send message to AI |

**POST `/user/ai/chat` body:**
```json
{ "message": "How do I become a backend engineer?" }
```

---

## CATEGORIES (`/categories`)

| Method | Endpoint | Description | Admin |
|--------|----------|-------------|-------|
| GET | `/` | Get all categories | — |
| GET | `/slug/:slug` | Get category by slug | — |
| GET | `/:id` | Get category by ID | — |
| POST | `/` | Create category | ✅ |
| PUT | `/:id` | Update category | ✅ |
| DELETE | `/:id` | Delete category | ✅ |

---

## SKILLS (`/skills`)

| Method | Endpoint | Description | Admin |
|--------|----------|-------------|-------|
| GET | `/` | Get all skills (with filtering) | — |
| GET | `/trending` | Get trending skills | — |
| GET | `/:id` | Get skill by ID | — |
| GET | `/slug/:slug` | Get skill by slug | — |
| GET | `/user/:profileId` | Get user's skills | — |
| POST | `/` | Create skill | ✅ |
| PUT | `/:id` | Update skill | ✅ |
| DELETE | `/:id` | Delete skill | ✅ |

**Query Params**: `&category_id=`, `&search=`

---

## COURSES (`/courses`)

| Method | Endpoint | Description | Admin |
|--------|----------|-------------|-------|
| GET | `/` | Get all courses (paginated) | — |
| GET | `/stats` | Get course statistics | — |
| GET | `/:id` | Get course by ID | — |
| GET | `/slug/:slug` | Get course by slug | — |
| GET | `/category/:categoryId` | Get courses by category | — |
| POST | `/` | Create course | ✅ |
| PUT | `/:id` | Update course | ✅ |
| DELETE | `/:id` | Delete course | ✅ |

**Query Params**: `&difficulty=`, `&is_active=`, `&search=`, `&page=`, `&limit=`

---

## JOB ROLES (`/job-roles`)

| Method | Endpoint | Description | Admin |
|--------|----------|-------------|-------|
| GET | `/` | Get all job roles | — |
| GET | `/trending` | Get trending job roles | — |
| GET | `/:id` | Get job role by ID | — |
| GET | `/slug/:slug` | Get job role by slug | — |
| GET | `/category/:categoryId` | Get roles by category | — |
| POST | `/` | Create job role | ✅ |
| PUT | `/:id` | Update job role | ✅ |
| DELETE | `/:id` | Delete job role | ✅ |

**Query Params**: `&seniority_level=`, `&search=`, `&page=`, `&limit=`

---

## PROGRESS (`/progress`)

| Method | Endpoint | Description | Admin |
|--------|----------|-------------|-------|
| GET | `/` | Get all progress entries | ✅ |
| GET | `/user/:profileId` | Get user's course progress | — |
| GET | `/user/:profileId/stats` | Get user progress statistics | — |
| GET | `/:profileId/:courseId` | Get specific course progress | — |
| POST | `/:profileId/:courseId/start` | Start a course | — |
| PUT | `/:profileId/:courseId` | Update course progress | — |
| POST | `/:profileId/:courseId/complete` | Complete a course | — |
| DELETE | `/:id` | Delete progress entry | ✅ |

**Query Params**: `&status=`, `&page=`, `&limit=`

---

## CHAT (`/chat`)

| Method | Endpoint | Description | Admin |
|--------|----------|-------------|-------|
| GET | `/sessions/:profileId` | Get user's chat sessions | — |
| POST | `/sessions/:profileId` | Create chat session | — |
| GET | `/:sessionId` | Get session by ID | — |
| GET | `/:sessionId/messages` | Get session messages | — |
| POST | `/:sessionId/messages` | Add message to session | — |
| GET | `/:sessionId/search` | Search messages | — |
| PUT | `/:sessionId` | Update session | — |
| POST | `/:sessionId/archive` | Archive session | — |
| DELETE | `/:sessionId` | Delete session | — |

**Query Params**: `&query=`, `&status=`

---

## NOTIFICATIONS (`/notifications`)

| Method | Endpoint | Description | Admin |
|--------|----------|-------------|-------|
| GET | `/:profileId` | Get user notifications | — |
| GET | `/:profileId/unread` | Get unread count | — |
| GET | `/:profileId/stats` | Get notification stats | — |
| GET | `/:id` | Get notification by ID | — |
| POST | `/` | Create notification | ✅ |
| PUT | `/:id/read` | Mark as read | — |
| PUT | `/:profileId/mark-all-read` | Mark all as read | — |
| DELETE | `/:id` | Delete notification | — |
| DELETE | `/:profileId/delete-read` | Delete all read | — |

**Query Params**: `&is_read=`, `&type=`, `&page=`, `&limit=`

---

## ROADMAPS (`/roadmaps`)

| Method | Endpoint | Description | Admin |
|--------|----------|-------------|-------|
| GET | `/` | Get all roadmaps | ✅ |
| GET | `/stats` | Get roadmap statistics | ✅ |
| GET | `/:id` | Get roadmap by ID | — |
| GET | `/user/:profileId` | Get user's roadmaps | — |
| GET | `/:roadmapId/steps` | Get roadmap steps | — |
| POST | `/` | Create roadmap | — |
| PUT | `/:id/status` | Update roadmap status | — |
| PUT | `/steps/:stepId` | Update roadmap step | — |
| DELETE | `/:id` | Delete roadmap | ✅ |

---

## PLANS (`/plans`)

| Method | Endpoint | Description | Admin |
|--------|----------|-------------|-------|
| GET | `/` | Get all plans | — |
| GET | `/active` | Get active plans only | — |
| GET | `/:id` | Get plan by ID | — |
| GET | `/slug/:slug` | Get plan by slug | — |
| POST | `/` | Create plan | ✅ |
| PUT | `/:id` | Update plan | ✅ |
| DELETE | `/:id` | Delete plan | ✅ |

---

## SUBSCRIPTIONS (`/subscriptions`)

| Method | Endpoint | Description | Admin |
|--------|----------|-------------|-------|
| GET | `/` | Get all subscriptions | ✅ |
| GET | `/stats` | Get subscription stats | ✅ |
| GET | `/expiring` | Get expiring subscriptions | ✅ |
| GET | `/:id` | Get subscription by ID | ✅ |
| GET | `/user/:profileId` | Get user subscription | — |
| POST | `/` | Create subscription | — |
| PUT | `/:id/cancel` | Cancel subscription | — |

---

## JOB MARKET TRENDS (`/market-trends`)

| Method | Endpoint | Description | Admin |
|--------|----------|-------------|-------|
| GET | `/` | Get all trends | — |
| GET | `/trending` | Get trending roles | — |
| GET | `/declining` | Get declining roles | — |
| GET | `/stable` | Get stable roles | — |
| GET | `/market/stats` | Get market statistics | — |
| GET | `/:id` | Get trend by ID | — |
| GET | `/role/:jobRoleId` | Get trend by job role | — |
| POST | `/` | Create/update trend | ✅ |

---

## Request / Response Examples

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@nexapath.com",
  "password": "securepassword"
}

Response:
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "user@nexapath.com" },
    "token": "eyJhbGci..."
  }
}
```

### Get All Categories
```bash
GET /api/categories

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Web Development",
      "slug": "web-development",
      "description": "...",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 5
}
```

### Create Skill
```bash
POST /api/skills
Content-Type: application/json

{
  "name": "React",
  "slug": "react",
  "description": "JavaScript library for building UIs",
  "category_id": "uuid"
}

Response:
{
  "success": true,
  "message": "Skill created successfully",
  "data": { "id": "uuid", "name": "React", ... }
}
```

### Send AI Chat Message (authenticated)
```bash
POST /api/user/ai/chat
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "message": "What skills do I need to become a backend engineer?"
}

Response:
{
  "success": true,
  "data": {
    "reply": "To become a backend engineer, you should focus on..."
  }
}
```

### Get User Progress
```bash
GET /api/progress/user/user-uuid

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "profile_id": "user-uuid",
      "course_id": "course-uuid",
      "status": "in_progress",
      "progress_pct": 45,
      "course": { "title": "React Basics", "difficulty": "beginner" }
    }
  ],
  "count": 1
}
```

---

## Common Query Parameters

### Pagination
```
?page=1&limit=20
```

### Filtering
```
?category_id=uuid&status=active&search=keyword
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": "Required field missing: name"
}
```

### 500 Server Error
```json
{
  "success": false,
  "error": "Server error message"
}
```

---

## Authentication

### Admin endpoints
Pass admin credentials to `POST /api/admin/login`, then include the returned token:
```
Authorization: Bearer <admin-jwt-token>
```

### User endpoints (`/api/user/*`)
Pass user credentials to `POST /api/auth/login`, then include the returned token:
```
Authorization: Bearer <user-jwt-token>
```

---

## API Version

Current API Version: **v1**

All endpoints follow the pattern: `/api/<resource>`

---

**Last updated**: April 2026
**Environment**: Development / Staging / Production
