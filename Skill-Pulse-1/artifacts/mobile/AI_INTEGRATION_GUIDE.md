# Integrating AI Into the SkillPulse Mobile App

## Purpose

This guide explains how to integrate the existing AI service into the Expo mobile app in a secure, scalable, and production-friendly way.

Current stack already available in this repository:
- Mobile app: Expo React Native in `Skill-Pulse-1/artifacts/mobile`
- Backend API: Node.js/Express in `Backend`
- AI service: FastAPI in `Backend/ai/backend.py`

## Existing AI Endpoints You Already Have

The AI service currently exposes these endpoints:
- `GET /health`
- `GET /models`
- `POST /analyze-skill-gaps`
- `POST /generate-roadmap`
- `POST /recommend`
- `POST /career-advice`
- `POST /generate-job-description`

The AI service also supports service-token auth via `x-ai-service-token` (recommended).

## Recommended Integration Pattern

Use this flow:

1. Mobile app calls Node backend endpoints only.
2. Node backend validates user JWT.
3. Node backend forwards allowed AI requests to FastAPI with `x-ai-service-token`.
4. FastAPI responds to backend.
5. Backend returns normalized response to mobile.

### Why this pattern is best

- Security: mobile never sees `AI_SERVICE_TOKEN`.
- Consistency: one API surface for mobile.
- Observability: backend can log, rate-limit, and trace all AI requests.
- Flexibility: you can swap AI providers/models without mobile changes.

## What Is Already Reusable

You already have backend-side AI forwarding logic in:
- `Backend/services/analysisService.js`

And mobile already has a shared request helper pattern in:
- `Skill-Pulse-1/artifacts/mobile/lib/api/mobileApi.ts`

So the integration mostly needs endpoint expansion and mobile feature wiring.

## Step-by-Step Implementation Plan

## Step 1: Define Mobile AI Feature Set

Start with these high-value features:
- Personalized recommendations
- Career advice chat prompt workflow
- Role-based roadmap generation
- Job description draft generator

Keep each feature single-purpose and response-size limited for mobile UX.

## Step 2: Add Backend Proxy Endpoints

Create new protected routes under `/api/user/ai` (or `/api/ai` if mixed public/private):

- `POST /api/user/ai/recommend`
- `POST /api/user/ai/career-advice`
- `POST /api/user/ai/roadmap`
- `POST /api/user/ai/job-description`

Backend route handlers should:
- validate payload with `express-validator`
- enforce request-size limits
- inject user context (`user_id`, profile metadata)
- call FastAPI through one shared service
- normalize errors to consistent mobile-safe format

Example response envelope:

```json
{
  "success": true,
  "data": {
    "content": "AI output...",
    "meta": {
      "model": "gemma3:1b",
      "durationMs": 842
    }
  }
}
```

## Step 3: Add Mobile AI API Module

Create:
- `Skill-Pulse-1/artifacts/mobile/lib/api/aiApi.ts`

Reuse your existing request style from `mobileApi.ts`:
- include JWT auth header
- throw clear errors with backend message
- keep typed responses

Suggested functions:
- `getAiRecommendations(payload)`
- `getCareerAdvice(payload)`
- `generateRoadmap(payload)`
- `generateJobDescription(payload)`

## Step 4: Add React Query Hooks

Create:
- `Skill-Pulse-1/artifacts/mobile/hooks/useAi.ts`

Use `useMutation` for generation-style calls and `useQuery` for cached reads.

Suggested query keys:
- `['ai', 'recommendations', userId]`
- `['ai', 'roadmap', targetRole, userId]`

Benefits:
- automatic loading/error states
- retries for transient failures
- cache reuse across screens

## Step 5: Create AI Screens in Mobile

Add one screen at a time:
- `app/recommendations.tsx` (already exists, can be upgraded)
- `app/ai-career-advice.tsx`
- `app/ai-roadmap.tsx`
- `app/ai-job-description.tsx`

UX checklist for each:
- clear prompt input
- submit button + disabled pending state
- skeleton/loading placeholder
- clear retry CTA on error
- copy/share actions for generated content

## Step 6: Secure and Harden

On backend:
- strict payload validation and max lengths
- per-user rate limit for AI endpoints
- timeout and abort controller around AI calls
- redact sensitive fields before logs

On AI service:
- keep `AI_REQUIRE_AUTH=true`
- rotate `AI_SERVICE_TOKEN` periodically
- keep `AI_CORS_ORIGINS` minimal if browser access is ever enabled

## Step 7: Add Analytics and Monitoring

Capture these metrics at backend proxy layer:
- request count by endpoint
- median and p95 latency
- timeout and error rates
- token usage estimate (if model/provider exposes usage)

Also log:
- request id
- user id
- endpoint
- model selected
- response status

This makes it easy to debug slow or failing AI flows seen in mobile.

## Step 8: Testing Strategy

### Backend tests
- validation rejects bad payloads
- proxy handles upstream timeout
- upstream 4xx/5xx mapped cleanly
- auth and role checks enforced

### Mobile tests
- loading states render correctly
- API errors surfaced with actionable text
- retries work without duplicate UI glitches
- offline/network-failure handling behaves predictably

### End-to-end
- sign in -> request AI feature -> receive output -> persist/share where needed

## Suggested API Contracts

## Career advice

Request:

```json
{
  "goal": "Become a backend engineer",
  "experienceLevel": "junior",
  "context": {
    "currentSkills": ["JavaScript", "Node.js"],
    "targetTimelineMonths": 6
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "summary": "Focus on API design, SQL, and testing.",
    "actionItems": [
      "Build one production-style REST project",
      "Add test coverage with Jest",
      "Learn PostgreSQL indexing basics"
    ]
  }
}
```

## Roadmap generation

Request:

```json
{
  "targetRole": "Frontend Developer",
  "weeks": 8
}
```

Response:

```json
{
  "success": true,
  "data": {
    "milestones": [
      { "week": 1, "focus": "React fundamentals" },
      { "week": 2, "focus": "State management" }
    ]
  }
}
```

## Rollout Plan

## Phase 1 (fastest)
- Connect mobile to existing backend AI-backed outputs (`recommendations`, `skill-gaps`) and improve UX.

## Phase 2
- Add dedicated `/api/user/ai/*` proxy endpoints and new AI mobile screens.

## Phase 3
- Add usage analytics, response caching, and prompt templates by domain.

## Phase 4
- Add personalization memory, saved AI sessions, and feedback loop for response quality.

## Practical Notes for This Repository

- Keep AI integration in backend as service methods similar to `analysisService.js`.
- Keep mobile AI calls in a separate file (`aiApi.ts`) rather than mixing with generic profile APIs.
- Keep AI responses normalized so all mobile screens can use one renderer pattern.
- Keep feature flags for AI screens to safely release incrementally.

## Quick Win Checklist

- [ ] Add backend `/api/user/ai/career-advice` proxy endpoint
- [ ] Add mobile `aiApi.ts` and `useAi.ts`
- [ ] Add one AI screen (career advice) and test end-to-end
- [ ] Add timeout + retry + error UI polish
- [ ] Add latency/error logs in backend

---

If you want, the next step can be generating the actual backend route/controller files plus the mobile `aiApi.ts` and `useAi.ts` implementation so this guide becomes working code immediately.
