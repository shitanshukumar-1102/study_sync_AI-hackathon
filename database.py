import os
import sqlite3
import uuid
from datetime import datetime, date
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase_client = None
use_sqlite = True

# Try to initialize Supabase
if SUPABASE_URL and SUPABASE_ANON_KEY and "YOUR_SUPABASE" not in SUPABASE_URL:
    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        use_sqlite = False
        print("StudySync DB: Connected to Supabase cloud database.")
    except Exception as e:
        print(f"StudySync DB: Failed to connect to Supabase ({e}). Falling back to local SQLite.")
else:
    print("StudySync DB: Supabase credentials missing. Running in local SQLite mode.")

# Local SQLite DB configuration
DB_FILE = "studysync.db"

def get_sqlite_conn():
    """Returns a connection to the local SQLite database."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_sqlite_db():
    """Initializes SQLite tables if they do not exist."""
    if not use_sqlite:
        return
    
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            college TEXT,
            course TEXT,
            year_semester TEXT,
            subjects TEXT,
            xp INTEGER DEFAULT 0,
            coins INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            streak INTEGER DEFAULT 1,
            last_active TEXT,
            created_at TEXT,
            badges TEXT DEFAULT 'freshman'
        )
    """)
    
    # Check if badges column exists (for backward compatibility if database already created)
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN badges TEXT DEFAULT 'freshman'")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Create tasks table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT NOT NULL,
            priority TEXT CHECK(priority IN ('Low', 'Medium', 'High')),
            category TEXT CHECK(category IN ('Study', 'Assignment', 'Revision', 'Other')),
            due_date TEXT,
            completed INTEGER DEFAULT 0,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    # Create challenges table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS challenges (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            type TEXT CHECK(type IN ('study', 'tasks', 'revision', 'upload', 'quiz')),
            target INTEGER NOT NULL,
            progress INTEGER DEFAULT 0,
            completed INTEGER DEFAULT 0,
            xp_reward INTEGER DEFAULT 50,
            coins_reward INTEGER DEFAULT 10,
            date TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    conn.commit()
    conn.close()

# Initialize local SQLite if applicable
init_sqlite_db()

# --- USER PROFILE CRUD ---

def create_user_profile(user_id, email, full_name, college, course, year_semester, subjects):
    """Creates a user record in the active database."""
    last_active = date.today().isoformat()
    created_at = datetime.utcnow().isoformat()
    
    if not use_sqlite and supabase_client:
        try:
            data = {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "college": college,
                "course": course,
                "year_semester": year_semester,
                "subjects": subjects,
                "xp": 100, # Initial signup reward!
                "coins": 20,
                "level": 1,
                "streak": 1,
                "last_active": last_active,
                "badges": "freshman"
            }
            supabase_client.table("users").upsert(data).execute()
            return data
        except Exception as e:
            print(f"Supabase Error in create_user_profile: {e}. Falling back to SQLite.")
            
    # SQLite logic
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO users (id, email, full_name, college, course, year_semester, subjects, xp, coins, level, streak, last_active, created_at, badges)
        VALUES (?, ?, ?, ?, ?, ?, ?, 100, 20, 1, 1, ?, ?, 'freshman')
    """, (user_id, email, full_name, college, course, year_semester, subjects, last_active, created_at))
    conn.commit()
    conn.close()
    return {
        "id": user_id, "email": email, "full_name": full_name, "college": college,
        "course": course, "year_semester": year_semester, "subjects": subjects,
        "xp": 100, "coins": 20, "level": 1, "streak": 1, "last_active": last_active,
        "badges": "freshman"
    }

def get_user_profile(user_id):
    """Fetches user information and handles daily streak calculation."""
    today = date.today().isoformat()
    
    if not use_sqlite and supabase_client:
        try:
            res = supabase_client.table("users").select("*").eq("id", user_id).execute()
            if res.data:
                profile = res.data[0]
                profile = check_and_update_streak(profile)
                return profile
        except Exception as e:
            print(f"Supabase Error in get_user_profile: {e}. Falling back.")
            
    # SQLite
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        profile = dict(row)
        profile = check_and_update_streak(profile)
        return profile
    return None

def check_and_update_streak(profile):
    """Calculates and updates study streak based on last active date."""
    user_id = profile["id"]
    last_active_str = profile.get("last_active")
    streak = profile.get("streak", 1)
    today = date.today()
    
    if last_active_str:
        try:
            last_active = datetime.strptime(last_active_str, "%Y-%m-%d").date()
        except ValueError:
            # Handle timestamps with times
            last_active = datetime.strptime(last_active_str.split("T")[0], "%Y-%m-%d").date()
            
        delta = (today - last_active).days
        
        if delta == 1:
            # Active on consecutive day, increment streak!
            streak += 1
            profile["streak"] = streak
            profile["last_active"] = today.isoformat()
            update_user_stats(user_id, xp=profile["xp"] + 20, coins=profile["coins"] + 5, level=profile["level"], streak=streak, last_active=today.isoformat())
            profile["xp"] += 20
            profile["coins"] += 5
        elif delta > 1:
            # Streak broken
            streak = 1
            profile["streak"] = streak
            profile["last_active"] = today.isoformat()
            update_user_stats(user_id, xp=profile["xp"], coins=profile["coins"], level=profile["level"], streak=streak, last_active=today.isoformat())
        elif delta == 0:
            # Already active today, do nothing
            pass
    else:
        profile["last_active"] = today.isoformat()
        update_user_stats(user_id, xp=profile["xp"], coins=profile["coins"], level=profile["level"], streak=streak, last_active=today.isoformat())
        
    return profile

def update_user_stats(user_id, xp, coins, level, streak, last_active=None):
    """Updates XP, coins, level, and streaks for a user."""
    if not last_active:
        last_active = date.today().isoformat()
        
    if not use_sqlite and supabase_client:
        try:
            supabase_client.table("users").update({
                "xp": xp,
                "coins": coins,
                "level": level,
                "streak": streak,
                "last_active": last_active
            }).eq("id", user_id).execute()
            return
        except Exception as e:
            print(f"Supabase Error in update_user_stats: {e}")
            
    # SQLite
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users
        SET xp = ?, coins = ?, level = ?, streak = ?, last_active = ?
        WHERE id = ?
    """, (xp, coins, level, streak, last_active, user_id))
    conn.commit()
    conn.close()

def update_user_badges_and_coins(user_id, badges_str, new_coins):
    """Saves purchased badges and updates the coin balance."""
    if not use_sqlite and supabase_client:
        try:
            supabase_client.table("users").update({
                "badges": badges_str,
                "coins": new_coins
            }).eq("id", user_id).execute()
            return
        except Exception as e:
            print(f"Supabase Error in update_user_badges_and_coins: {e}")
            
    # SQLite
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users
        SET badges = ?, coins = ?
        WHERE id = ?
    """, (badges_str, new_coins, user_id))
    conn.commit()
    conn.close()

# --- TASKS CRUD ---

def get_tasks(user_id):
    """Retrieves all tasks for the user."""
    if not use_sqlite and supabase_client:
        try:
            res = supabase_client.table("tasks").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            return res.data
        except Exception as e:
            print(f"Supabase Error in get_tasks: {e}")
            
    # SQLite
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def create_task(user_id, title, priority="Medium", category="Study", due_date=None):
    """Creates a new task and increments challenge progress if applicable."""
    task_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    
    if not use_sqlite and supabase_client:
        try:
            data = {
                "id": task_id,
                "user_id": user_id,
                "title": title,
                "priority": priority,
                "category": category,
                "due_date": due_date,
                "completed": False,
                "created_at": created_at
            }
            supabase_client.table("tasks").insert(data).execute()
            # Try to increment challenges tasks completed progress
            return data
        except Exception as e:
            print(f"Supabase Error in create_task: {e}")
            
    # SQLite
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tasks (id, user_id, title, priority, category, due_date, completed, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    """, (task_id, user_id, title, priority, category, due_date, created_at))
    conn.commit()
    conn.close()
    return {
        "id": task_id, "user_id": user_id, "title": title, "priority": priority,
        "category": category, "due_date": due_date, "completed": False, "created_at": created_at
    }

def update_task(user_id, task_id, completed):
    """Toggles completion status of a task and triggers challenge progress."""
    comp_val_bool = bool(completed)
    comp_val_int = 1 if completed else 0
    
    if not use_sqlite and supabase_client:
        try:
            supabase_client.table("tasks").update({"completed": comp_val_bool}).eq("id", task_id).eq("user_id", user_id).execute()
        except Exception as e:
            print(f"Supabase Error in update_task: {e}")
    else:
        # SQLite
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?", (comp_val_int, task_id, user_id))
        conn.commit()
        conn.close()
        
    # Reward for task completion (if completed)
    rewards_earned = {"xp": 0, "coins": 0, "challenge_completed": False}
    if completed:
        # Check and progress daily challenge of type 'tasks'
        rewards_earned = update_challenge_progress(user_id, "tasks", 1)
        # Give direct rewards for completing a task too
        rewards_earned["xp"] += 10
        rewards_earned["coins"] += 2
        
        # Award user
        profile = get_user_profile(user_id)
        if profile:
            new_xp = profile["xp"] + rewards_earned["xp"]
            new_coins = profile["coins"] + rewards_earned["coins"]
            # Level up calculation: Level = XP // 500 + 1
            new_level = (new_xp // 500) + 1
            update_user_stats(user_id, new_xp, new_coins, new_level, profile["streak"])
            rewards_earned["new_xp"] = new_xp
            rewards_earned["new_coins"] = new_coins
            rewards_earned["new_level"] = new_level
            
    return rewards_earned

def delete_task(user_id, task_id):
    """Deletes a task."""
    if not use_sqlite and supabase_client:
        try:
            supabase_client.table("tasks").delete().eq("id", task_id).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            print(f"Supabase Error in delete_task: {e}")
            
    # SQLite
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ? AND user_id = ?", (task_id, user_id))
    conn.commit()
    conn.close()
    return True

def reset_user_tasks(user_id):
    """Resets completed status of all user tasks to uncompleted (0/False)."""
    if not use_sqlite and supabase_client:
        try:
            supabase_client.table("tasks").update({"completed": False}).eq("user_id", user_id).execute()
            return
        except Exception as e:
            print(f"Supabase Error in reset_user_tasks: {e}")
            
    # SQLite
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("UPDATE tasks SET completed = 0 WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()



# --- CHALLENGE SYSTEM ---

DEFAULT_CHALLENGES = [
    {"title": "Study for 60 minutes", "description": "Engage in focused study sessions", "type": "study", "target": 60, "xp_reward": 50, "coins_reward": 10},
    {"title": "Complete 3 tasks", "description": "Check off items in your task manager", "type": "tasks", "target": 3, "xp_reward": 60, "coins_reward": 15},
    {"title": "Complete one AI Quiz", "description": "Test your knowledge on a generated quiz", "type": "quiz", "target": 1, "xp_reward": 80, "coins_reward": 20},
    {"title": "Upload study notes", "description": "Add PDF, text, or manual notes for AI summary", "type": "upload", "target": 1, "xp_reward": 40, "coins_reward": 8},
    {"title": "Revise one summary", "description": "Review a study summary", "type": "revision", "target": 1, "xp_reward": 30, "coins_reward": 5}
]

def generate_daily_challenges(user_id):
    """Generates the daily challenge list for a user for today."""
    today = date.today().isoformat()
    
    if not use_sqlite and supabase_client:
        try:
            # Check if already generated for today
            res = supabase_client.table("challenges").select("*").eq("user_id", user_id).eq("date", today).execute()
            if res.data:
                return res.data
            
            # Generate new ones
            new_challenges = []
            for chal in DEFAULT_CHALLENGES:
                data = {
                    "user_id": user_id,
                    "title": chal["title"],
                    "description": chal["description"],
                    "type": chal["type"],
                    "target": chal["target"],
                    "progress": 0,
                    "completed": False,
                    "xp_reward": chal["xp_reward"],
                    "coins_reward": chal["coins_reward"],
                    "date": today
                }
                new_challenges.append(data)
            insert_res = supabase_client.table("challenges").insert(new_challenges).execute()
            return insert_res.data
        except Exception as e:
            print(f"Supabase Error in generate_daily_challenges: {e}. Falling back to SQLite.")
            
    # SQLite
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM challenges WHERE user_id = ? AND date = ?", (user_id, today))
    rows = cursor.fetchall()
    
    if rows:
        conn.close()
        return [dict(row) for row in rows]
        
    # Generate new ones
    created_chals = []
    for chal in DEFAULT_CHALLENGES:
        chal_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO challenges (id, user_id, title, description, type, target, progress, completed, xp_reward, coins_reward, date)
            VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
        """, (chal_id, user_id, chal["title"], chal["description"], chal["type"], chal["target"], chal["xp_reward"], chal["coins_reward"], today))
        created_chals.append({
            "id": chal_id, "user_id": user_id, "title": chal["title"], "description": chal["description"],
            "type": chal["type"], "target": chal["target"], "progress": 0, "completed": False,
            "xp_reward": chal["xp_reward"], "coins_reward": chal["coins_reward"], "date": today
        })
    conn.commit()
    conn.close()
    return created_chals

def update_challenge_progress(user_id, challenge_type, increment=1):
    """Increments progress on a user's active daily challenge by type."""
    today = date.today().isoformat()
    rewards = {"xp": 0, "coins": 0, "challenge_completed": False, "messages": []}
    
    if not use_sqlite and supabase_client:
        try:
            res = supabase_client.table("challenges").select("*").eq("user_id", user_id).eq("type", challenge_type).eq("date", today).execute()
            if res.data:
                challenge = res.data[0]
                if not challenge["completed"]:
                    new_progress = min(challenge["progress"] + increment, challenge["target"])
                    is_completed = new_progress >= challenge["target"]
                    
                    update_data = {
                        "progress": new_progress,
                        "completed": is_completed
                    }
                    supabase_client.table("challenges").update(update_data).eq("id", challenge["id"]).execute()
                    
                    if is_completed:
                        rewards["xp"] = challenge["xp_reward"]
                        rewards["coins"] = challenge["coins_reward"]
                        rewards["challenge_completed"] = True
                        rewards["messages"].append(f"Completed Challenge: {challenge['title']}!")
                        
                    return rewards
        except Exception as e:
            print(f"Supabase Error in update_challenge_progress: {e}. Falling back to SQLite.")
            
    # SQLite
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM challenges WHERE user_id = ? AND type = ? AND date = ?", (user_id, challenge_type, today))
    row = cursor.fetchone()
    
    if row:
        challenge = dict(row)
        if not challenge["completed"]:
            new_progress = min(challenge["progress"] + increment, challenge["target"])
            is_completed = 1 if new_progress >= challenge["target"] else 0
            
            cursor.execute("UPDATE challenges SET progress = ?, completed = ? WHERE id = ?", (new_progress, is_completed, challenge["id"]))
            conn.commit()
            
            if is_completed:
                rewards["xp"] = challenge["xp_reward"]
                rewards["coins"] = challenge["coins_reward"]
                rewards["challenge_completed"] = True
                rewards["messages"].append(f"Completed Challenge: {challenge['title']}!")
                
    conn.close()
    return rewards


def get_weekly_history(user_id):
    """Retrieves actual study and task challenge progress for the last 7 days."""
    import datetime
    
    # Generate dates for the last 7 days ending today
    dates = []
    for i in range(6, -1, -1):
        d = (datetime.date.today() - datetime.timedelta(days=i)).isoformat()
        dates.append(d)
        
    use_sqlite_fallback = False
    rows = []
    
    if not use_sqlite and supabase_client:
        try:
            # Query supabase for challenges in the last 7 days
            res = supabase_client.table("challenges").select("*").eq("user_id", user_id).in_("date", dates).execute()
            rows = res.data
        except Exception as e:
            print(f"Supabase Error in get_weekly_history: {e}. Falling back to SQLite.")
            use_sqlite_fallback = True
    else:
        use_sqlite_fallback = True
        
    if use_sqlite_fallback:
        try:
            conn = get_sqlite_conn()
            cursor = conn.cursor()
            # Query SQLite
            placeholders = ",".join(["?"] * len(dates))
            query = f"SELECT * FROM challenges WHERE user_id = ? AND date IN ({placeholders})"
            cursor.execute(query, [user_id] + dates)
            rows = [dict(row) for row in cursor.fetchall()]
            conn.close()
        except Exception as e:
            print(f"SQLite Error in get_weekly_history: {e}")
            rows = []
        
    # Group by date and type
    data_by_date = {d: {"study": 0, "tasks": 0} for d in dates}
    for row in rows:
        row_date = row.get("date")
        if isinstance(row_date, datetime.date):
            row_date = row_date.isoformat()
        elif isinstance(row_date, str) and "T" in row_date:
            row_date = row_date.split("T")[0]
            
        if row_date in data_by_date:
            row_type = row.get("type")
            if row_type in ["study", "tasks"]:
                data_by_date[row_date][row_type] = row.get("progress", 0)
                
    # Return list in chronological order
    result = []
    for d in dates:
        result.append({
            "date": d,
            "study": data_by_date[d]["study"],
            "tasks": data_by_date[d]["tasks"]
        })
    return result

