# StudySync AI – Smart Student Productivity Platform

StudySync AI is a gamified productivity platform built to help students manage assignments, track study schedules, generate notes summaries, and test their skills with custom quizzes. 

The application utilizes a glassmorphic dark-theme user interface running on a Python Flask backend. It connects to Google Gemini 1.5 Flash for notes summarization and quiz generation, and integrates Supabase for user auth and cloud database storage.

---

## 🔥 Key Features

- **Smart Task Checklist**: Organize study tasks by course category and priority level. Check off completed items to instantly earn XP and Coins.
- **AI Summary Engine**: Input notes or topic keywords to receive structured summary sheets, quick revision bulletins, and key takeaways.
- **AI MCQ Quizzer**: Auto-generate 5-question practice quizzes from notes. Get instant answer verification, score reports, and coins/XP rewards on completion.
- **Quest & Streak tracker**: Maintain daily study streaks. Complete random daily quests to score extra coin rewards.
- **Badge Showcase**: Buy custom badges in the shop using earned coins and display them on your academic profile page.
- **Dynamic Leaderboard**: See real-time standings of all registered students sorted by total XP, highlighting your own position.
- **Peer Chat Rooms**: Join custom study spaces to chat with classmates in real-time. No bots, just peer-to-peer collaboration.
- **Web Audio Sound Effects**: Custom synthesized 8-bit sounds that trigger on button clicks, task completions, quiz grades, chat arrivals, and quest unlocks.

---

## 🛠️ Tech Stack & Architecture Updates

### 1. Flask-Based Chat Syncing
Instead of relying on fragile client-side real-time listeners or WebSockets (which often drop connections or hit rate limits on free hosting plans like Render), the chat system runs on a lightweight polling architecture:
- Messages are processed and synchronized through backend routes (`/api/chat/messages` and `/api/chat/send`).
- A message ID deduplication set on the frontend prevents duplicate bubble rendering.
- Guaranteed real-time delivery across multiple browser windows or devices.

### 2. Live Leaderboard System
The leaderboard is populated dynamically from database statistics (`/api/leaderboard`):
- Standings are fetched, sorted, and rendered on the client side.
- Highlights your row with special styles and appends a `(You)` label to help you find your rank instantly.

### 3. Web Audio API Synthesizer
Rather than loading heavy audio assets (MP3s/WAVs) that slow down page loads, we use the browser's built-in `AudioContext` to synthesize sound effects dynamically:
- Short frequency burst on clicking navigation links and buttons.
- A rising C5-to-G5 tone on task completion.
- A soft bubble-pop sound on incoming chat messages.
- Clean double-chimes for correct quiz answers and descending sweep for incorrect ones.
- Triumphant fanfare arpeggio on leveling up or claiming rewards.

### 4. Cache-Busting Imports
All templates load JS static scripts with a version query parameter (`script.js?v=3`). This forces client browsers to fetch the latest code updates immediately, skipping cached files.

---

## 📁 File Directory

```text
StudySync-AI/
├── app.py                  # Core Flask server, route controllers, and API routing
├── database.py             # Database wrapper (Supabase integration + SQLite local fallback)
├── gemini.py               # Gemini API connector (includes structured fallback data)
├── requirements.txt        # Backend dependencies
├── README.md               # Documentation and setup instructions
├── templates/              # Jinja2 HTML layout views
│   ├── index.html          # Portal landing and user registration
│   ├── dashboard.html      # Study cockpit, timers, and AI generators
│   ├── challenges.html     # Leaderboards and peer study chats
│   └── profile.html        # Badges shop and academic dashboard
└── static/                 # Styles and frontend scripts
    ├── style.css           # Vanilla CSS rules, theme variables, and grid layouts
    ├── auth.js             # User login/signup frontend handlers
    ├── api.js              # Fetch client utility wrapping Flask endpoints
    └── script.js           # Core DOM controller, charting, and sound synthesizer
```

---

## 💻 Local Installation & Setup

1. **Clone the Repository** and open the project directory in your terminal.
2. **Create a Virtual Environment & Install Dependencies**:
   ```powershell
   # Setup environment
   python -m venv venv
   
   # Activate environment (Windows)
   .\venv\Scripts\activate
   
   # Install backend packages
   pip install -r requirements.txt
   ```
3. **Configure Environment Secrets**:
   Copy `.env.example` to a new file named `.env` and fill out the values:
   ```bash
   FLASK_SECRET_KEY="your-random-cookie-key"
   SUPABASE_URL="https://your-supabase-project.supabase.co"
   SUPABASE_ANON_KEY="your-supabase-public-anon-key"
   GEMINI_API_KEY="your-google-studio-api-key"
   ```
   *Note: If you leave the credentials empty, the app falls back to Mock Mode. It will initialize a local SQLite file (`studysync.db`) and serve simulated AI summaries/quizzes so you can test the platform instantly.*

---

## ⚡ SQL Database Schema

Run this SQL script in your Supabase SQL Editor or apply it to your database to set up the schema:

```sql
-- 1. User Profiles
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    college TEXT,
    course TEXT,
    year_semester TEXT,
    subjects TEXT,
    xp INTEGER DEFAULT 100,
    coins INTEGER DEFAULT 20,
    level INTEGER DEFAULT 1,
    streak INTEGER DEFAULT 1,
    last_active DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    badges TEXT DEFAULT 'freshman'
);

-- 2. Tasks Checklist
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
    category TEXT CHECK (category IN ('Study', 'Assignment', 'Revision', 'Other')) DEFAULT 'Study',
    due_date DATE,
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Daily Challenges
CREATE TABLE public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('study', 'tasks', 'revision', 'upload', 'quiz')) NOT NULL,
    target INTEGER NOT NULL,
    progress INTEGER DEFAULT 0 NOT NULL,
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    xp_reward INTEGER DEFAULT 50 NOT NULL,
    coins_reward INTEGER DEFAULT 10 NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL
);
```

---

## 🚀 Deployment Guide

### Render (Backend Hosting)
1. Push the code to a GitHub repository.
2. Create a new **Web Service** on Render, and link the repository.
3. Configure these build settings:
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
4. Go to the **Environment** tab on Render and paste the environment variables from your `.env` file.
