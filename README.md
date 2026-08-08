# StudySync AI – Smart Student Productivity Platform

StudySync AI is a production-grade, gamified productivity companion built to assist students in tracking their assignments, managing daily schedules, generating AI summaries, and challenging themselves with interactive practice quizzes.

This platform features a modern **glassmorphism user interface** that adapts between light and dark themes. It runs a **Python Flask backend**, integrates **Google Gemini 1.5 Flash** for content generation, and uses **Supabase** for user authentication and SQL cloud storage.

---

## 🚀 Key Features

1. **Smart Task Manager**: Organize study tasks by category and priority. Check off items to directly earn XP and Coins.
2. **AI Summarization Space**: Upload documents (notes, assignments) or supply topics to receive a comprehensive summary, key takeaways, and quick revision cues.
3. **AI MCQ Quizzer**: Generate a 5-question multiple choice test based on note inputs. Play through an interactive board, get explanations, and submit scores for rewards.
4. **Gamified Quests & Streaks**: Maintain active consecutive login streaks. Complete randomized daily challenges to earn bonus coins.
5. **Achievement Badges Store**: Redeem accumulated coins to buy and show off badges on your profile page.
6. **Peer Study Rooms**: Simulated chatrooms to collaborate and get study tips from bots on different topics (Data Structures, DBMS, OS).
7. **Productivity Analytics**: View progress logs and study velocities with dynamic graphs.

---

## 📁 Folder Structure

```text
StudySync-AI/
├── app.py                  # Core Flask server, routing controller, and API endpoints
├── database.py             # DB controller (Supabase client + SQLite local persistence fallback)
├── gemini.py               # Google Gemini AI connection (with detailed local subject fallback data)
├── requirements.txt        # Backend dependencies
├── .env.example            # Environment variables template
├── README.md               # Setup and deployment guides
├── templates/              # HTML layout templates
│   ├── index.html          # Landing page & auth modals
│   ├── dashboard.html      # Main study cockpit & task checklists
│   ├── challenges.html     # Daily quests & peer chat simulation
│   └── profile.html        # Academic records & badge shop
└── static/                 # Static asset delivery
    ├── style.css           # Vanilla CSS styles, themes, and layouts
    ├── auth.js             # Authentication managers (Supabase + local mock storage)
    ├── api.js              # Fetch connection client to Flask API
    └── script.js           # DOM controllers, ChartJS charts, and quiz game loops
```

---

## 🛠️ Local Installation & Setup

Follow these steps to configure StudySync AI locally:

### 1. Clone & Initialize Workspace
Create a folder named `StudySync-AI` and copy these project files inside. Navigate to the directory in your terminal.

### 2. Configure Virtual Environment & Install Dependencies
Create a virtual environment and run the package installer:
```powershell
# Create environment
python -m venv venv

# Activate environment (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Setup Environment Secrets
Copy `.env.example` into a new file named `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill out the configuration variables:
- **`FLASK_SECRET_KEY`**: Set a random string to secure session cookies.
- **`SUPABASE_URL`** & **`SUPABASE_ANON_KEY`**: Found under **Project Settings ➔ API** in your Supabase Console.
- **`GEMINI_API_KEY`**: Generate a free key from [Google AI Studio](https://aistudio.google.com/).

> [!NOTE]
> If Supabase credentials or Gemini Keys are left at default or blank, the platform automatically switches to **Mock Demo Mode**. It will initialize a local SQLite file (`studysync.db`) and serve realistic simulated AI content so judges can test all features instantly without cloud setup!

---

## ⚡ Supabase SQL Setup Schema

Create a new query under **SQL Editor ➔ New query** in your Supabase Dashboard and run this script to establish the required tables:

```sql
-- 1. Create a public users table extending Supabase auth
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

-- Note: If you have already created the users table, execute the migration query below:
-- ALTER TABLE public.users ADD COLUMN badges TEXT DEFAULT 'freshman';

-- 2. Create tasks table
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

-- 3. Create daily challenges table
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

Ensure that policies are created or Row Level Security (RLS) is disabled for the `users`, `tasks`, and `challenges` tables so the client can query them.

---

## 💻 Running the Application

Start the Flask development server:
```bash
python app.py
```
Open your browser and navigate to: **`http://localhost:5000`**

---

## ☁️ Cloud Deployment Guides

### Backend (Render)
1. Push your repository to GitHub.
2. Sign in to [Render](https://render.com/) and create a new **Web Service**.
3. Link your GitHub repository.
4. Set the following settings:
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app` (Make sure to add `gunicorn` to your requirements.txt if deploying to Linux, or use `python app.py`).
5. Open **Environment Variables** in Render and paste your `.env` secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, etc.).

### Frontend Hosting (Vercel)
Since this is a full-stack Flask application, you can deploy the entire app to Vercel by adding a `vercel.json` routing configuration in the root:
```json
{
  "builds": [
    {
      "src": "app.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app.py"
    }
  ]
}
```
Deploy the project using Vercel CLI (`vercel`) or by linking the repository directly to your Vercel Dashboard.
