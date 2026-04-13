# SkillPulse Mobile App - Frontend Pages (Current Snapshot)

This document summarizes the current mobile frontend app and page structure as implemented today.

## Mobile App Overview

- App package: `@workspace/mobile`
- Framework: Expo + React Native + Expo Router
- Navigation style: file-based routing (stack + tabs)
- Data layer: `@tanstack/react-query`
- API hooks/client: `@workspace/api-client-react`
- UI style: custom components (`GlassCard`, `Badge`, `AnimatedSection`, `MotionPressable`) with a modern card-based layout and gradient accents

## Navigation Architecture

### Root Stack Routes

The root layout registers the primary routes:

- `/` - Welcome / entry screen
- `/login` - Login screen
- `/signup` - Sign-up screen
- `/onboarding` - Initial profile setup
- `/(tabs)` - Main tabbed app shell
- `/learn/[id]` - Dynamic roadmap detail page
- `/settings` - User settings and account/profile management
- `/profile-completion` - Explicit profile editor for AI context
- `/recommendations` - Personalized recommendations list
- `/ai-assistant` - AI chat assistant route

### Bottom Tab Routes

Inside `/(tabs)` there are 6 primary tabs:

- `/(tabs)/index` - Home dashboard
- `/(tabs)/skills` - Skill gap and analysis view
- `/(tabs)/learn` - Role roadmap explorer
- `/(tabs)/trends` - Market intelligence/trends
- `/(tabs)/ai-chat` - AI assistant chat tab
- `/(tabs)/profile` - Profile and account hub

## Frontend Page Inventory

### 1. Welcome and Authentication

- `/` (Welcome)
  - Shows brand screen and auth entry actions.
  - Attempts auto-entry to tabs when a saved session token and valid current user are present.
- `/login`
  - Email/password login form.
  - Stores access token locally on success and redirects to tabs.
- `/signup`
  - Account creation form with validation.
  - Stores token on success and redirects to onboarding.

### 2. Onboarding and Profile Setup

- `/onboarding`
  - Two-step onboarding flow.
  - Captures user basics, profile fields, and skills.
  - Computes profile strength score.
  - Triggers profile analysis recomputation and then enters main tabs.
- `/profile-completion`
  - Explicit profile editor for AI grounding.
  - Lets users set target role, education, experience, domain/stack preferences, and skill levels.
  - Saves explicit profile context used by AI responses and recommendations.

### 3. Main Tab Pages

- `/(tabs)/index` (Home Dashboard)
  - Career snapshot, confidence signals, strongest skill, market signals, and suggested next step.
  - Refreshable profile insights.
- `/(tabs)/skills`
  - Skill gap analysis and current skill state.
  - Supports AI-driven gap recomputation based on target role.
  - Includes profile completion CTA and insight cards.
- `/(tabs)/learn`
  - Role roadmap catalog and recommended roadmap entry.
  - Shows active roadmap summary and market-signal badges.
- `/(tabs)/trends`
  - Role-based market trend data.
  - Displays trending skills, demand signals, missing skills, and AI recommendations.
- `/(tabs)/ai-chat`
  - Chat-first AI assistant screen (same core chat UI as `/ai-assistant`).
  - Loads chat history and supports prompt shortcuts.
- `/(tabs)/profile`
  - User profile dashboard with score ring, achievements, top skills, activity cards, and account menu links.
  - Includes sign-out action.

### 4. Supporting Full-Screen Pages

- `/learn/[id]`
  - Generates and renders a role-specific roadmap in detail.
  - Includes visualization, staged plan, tools, and final portfolio project ideas.
- `/recommendations`
  - Personalized learning recommendations with filtering by type.
  - Supports manual refresh/recompute of recommendations.
- `/settings`
  - Account and profile edits, skill CRUD actions, password change, and sign-out.
- `/ai-assistant`
  - Route alias to the main AI chat screen component.
- `/admin`
  - Admin concept/demo screen (module mapping cards and admin snapshot style layout).
- `/+not-found`
  - Fallback not-found page for unknown routes.

## Current Frontend Notes

- The app is already structured around AI-assisted career guidance workflows:
  - Profile context (explicit + inferred)
  - Skill gap analysis
  - Market trend intelligence
  - Role-based roadmap generation
  - Conversational AI assistant
- Navigation combines onboarding/auth flows with a stable 6-tab post-login shell.
- Several screens include refresh/recompute actions to keep AI-derived data current.

## Suggested Next Documentation Additions

- Add wireflow diagrams for route transitions (auth -> onboarding -> tabs).
- Add API mapping per screen (which endpoint/hook each page calls).
- Add "page ownership" and component map for faster frontend collaboration.
