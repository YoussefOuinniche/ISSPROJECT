# Backend API - Local Supabase Connection

## 🚀 Quick Start

### 1. Start Supabase (Required First!)
```bash
npx supabase start
```

### 2. Install Dependencies
```bash
npm install @supabase/supabase-js express cors dotenv
```

### 3. Start the Backend Server
```bash
node app.js
```

## 📡 API Endpoints

### Test Connection
```
GET http://localhost:5000/test-db
```

### Get All Users
```
GET http://localhost:5000/api/users
```

### Get User Skills
```
GET http://localhost:5000/api/users/{userId}/skills
```

### Get User Recommendations
```
GET http://localhost:5000/api/users/{userId}/recommendations
```

## 🔌 Connection Details

**Local Supabase:**
- API URL: `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`
- Database: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

**Publishable Key:** `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH`

## 📁 Files

- `connect.js` - Supabase client connection (use this in frontend too!)
- `app.js` - Express server with example endpoints
- `backend.py` - Python FastAPI server for AI analysis

## 🎯 Usage

### Frontend Direct Connection (Recommended)
```javascript
import { supabase } from './Backend/connect.js';

// Get users
const { data, error } = await supabase
  .from('users')
  .select('*, profiles(*)');
```

### Via Backend API (For complex logic)
```javascript
const response = await fetch('http://localhost:5000/api/users');
const { data } = await response.json();
```
