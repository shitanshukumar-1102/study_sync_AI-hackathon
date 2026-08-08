import os
from functools import wraps
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
import fitz  # PyMuPDF

import database as db
import gemini as ai

load_dotenv()

# Global in-memory cache to store extracted PDF text: { user_id: text }
pdf_cache = {}

app = Flask(__name__)
# Generate a secret key if not provided in environment
app.secret_key = os.getenv("FLASK_SECRET_KEY", "studysync_secret_key_12345")

# --- LOGIN REQUIRED DECORATOR ---

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"error": "Unauthorized. Please log in."}), 401
            return redirect(url_for("login_route"))
        return f(*args, **kwargs)
    return decorated_function

# --- PAGE ROUTING ---

@app.route("/")
def index_route():
    """Serves landing page. Redirects to dashboard if already logged in."""
    if "user_id" in session:
        return redirect(url_for("dashboard_route"))
    return render_template("index.html", open_modal=None)

@app.route("/login")
def login_route():
    """Serves landing page with login modal open."""
    if "user_id" in session:
        return redirect(url_for("dashboard_route"))
    return render_template("index.html", open_modal="login")

@app.route("/signup")
def signup_route():
    """Serves landing page with signup modal open."""
    if "user_id" in session:
        return redirect(url_for("dashboard_route"))
    return render_template("index.html", open_modal="signup")

@app.route("/dashboard")
@login_required
def dashboard_route():
    """Renders primary student cockpit."""
    profile = db.get_user_profile(session["user_id"])
    if not profile:
        # Clear stale session
        session.clear()
        return redirect(url_for("login_route"))
    return render_template("dashboard.html", user=profile)

@app.route("/challenges")
@login_required
def challenges_route():
    """Renders challenge progress board and scoreboard."""
    profile = db.get_user_profile(session["user_id"])
    return render_template("challenges.html", user=profile)

@app.route("/profile")
@login_required
def profile_route():
    """Renders user academic details, stats and badges."""
    profile = db.get_user_profile(session["user_id"])
    return render_template("profile.html", user=profile)

@app.route("/logout")
def logout_route():
    """Logs the user out and clears session."""
    session.clear()
    return redirect(url_for("index_route"))


# --- API ENDPOINTS ---

@app.route("/api/auth/session", methods=["POST"])
def auth_session():
    """Synchronizes Supabase JS login token/user data with Flask session."""
    data = request.get_json()
    if not data or "userId" not in data:
        return jsonify({"success": False, "error": "Invalid auth details"}), 400
    
    # Store session values
    session["user_id"] = data["userId"]
    session["email"] = data["email"]
    session["full_name"] = data.get("fullName", "Student")
    
    # Sync with DB profile
    db.create_user_profile(
        user_id=data["userId"],
        email=data["email"],
        full_name=data.get("fullName", "Student"),
        college=data.get("college", ""),
        course=data.get("course", ""),
        year_semester=data.get("yearSemester", ""),
        subjects=data.get("subjects", "")
    )
    
    return jsonify({"success": True, "message": "Session established"})


@app.route("/api/profile", methods=["GET"])
@login_required
def api_get_profile():
    """Returns the logged in user's profile database entry."""
    profile = db.get_user_profile(session["user_id"])
    if profile:
        return jsonify({"success": True, "user": profile})
    return jsonify({"success": False, "error": "User not found"}), 404


@app.route("/api/tasks", methods=["GET", "POST", "PUT", "DELETE"])
@login_required
def api_tasks():
    """Handles CRUD for user tasks."""
    user_id = session["user_id"]
    
    if request.method == "GET":
        tasks = db.get_tasks(user_id)
        return jsonify({"success": True, "tasks": tasks})
        
    elif request.method == "POST":
        data = request.get_json() or {}
        title = data.get("title")
        if not title:
            return jsonify({"success": False, "error": "Task title is required"}), 400
            
        priority = data.get("priority", "Medium")
        category = data.get("category", "Study")
        due_date = data.get("due_date") # YYYY-MM-DD
        
        task = db.create_task(user_id, title, priority, category, due_date)
        return jsonify({"success": True, "task": task})
        
    elif request.method == "PUT":
        data = request.get_json() or {}
        task_id = data.get("id")
        completed = data.get("completed")
        
        if not task_id or completed is None:
            return jsonify({"success": False, "error": "Missing parameters"}), 400
            
        rewards = db.update_task(user_id, task_id, completed)
        return jsonify({"success": True, "rewards": rewards})
        
    elif request.method == "DELETE":
        task_id = request.args.get("id")
        if not task_id:
            return jsonify({"success": False, "error": "Missing task ID"}), 400
            
        db.delete_task(user_id, task_id)
        return jsonify({"success": True, "message": "Task deleted"})


@app.route("/api/challenges", methods=["GET"])
@login_required
def api_challenges():
    """Fetches user's active daily challenges."""
    user_id = session["user_id"]
    challenges = db.generate_daily_challenges(user_id)
    return jsonify({"success": True, "challenges": challenges})


@app.route("/api/summary", methods=["POST"])
@login_required
def api_summary():
    """Generates an AI study summary using Gemini from PDF upload, text, or subject/topic."""
    user_id = session["user_id"]
    extracted_text = None
    subject = ""
    topic = ""
    text = ""
    
    # Check if a file is uploaded
    if 'file' in request.files:
        file = request.files['file']
        if file and file.filename.endswith('.pdf'):
            try:
                file_bytes = file.read()
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                text_content = ""
                for page in doc:
                    text_content += page.get_text()
                extracted_text = text_content.strip()
                # Store in our memory cache
                pdf_cache[user_id] = extracted_text
            except Exception as e:
                print(f"Error extracting PDF: {e}")
                return jsonify({"success": False, "error": f"Failed to extract PDF text: {e}"}), 400
    else:
        # Clear PDF cache for this user since they are not uploading a file this time
        pdf_cache[user_id] = None

    # Parse request fields depending on content type (FormData vs JSON)
    if request.form:
        subject = request.form.get("subject", "")
        topic = request.form.get("topic", "")
        text = request.form.get("text", "")
    else:
        try:
            data = request.get_json() or {}
            subject = data.get("subject", "")
            topic = data.get("topic", "")
            text = data.get("text", "")
        except Exception:
            pass

    if extracted_text:
        source_content = extracted_text
        is_pdf = True
    else:
        source_content = text if text else f"Subject: {subject}, Topic: {topic}"
        is_pdf = False

    if not source_content or source_content.strip() == "Subject: , Topic: ":
        return jsonify({"success": False, "error": "Provide PDF file, text, or subject/topic details"}), 400
        
    # Generate summary
    summary_data = ai.generate_study_summary(source_content, subject, topic, is_pdf=is_pdf)
    
    # Progress 'upload' challenge
    rewards = db.update_challenge_progress(user_id, "upload", 1)
    
    # Check if they also reviewed a summary, progress 'revision' challenge
    revision_rewards = db.update_challenge_progress(user_id, "revision", 1)
    
    # Combine rewards
    combined_rewards = {
        "xp": rewards["xp"] + revision_rewards["xp"],
        "coins": rewards["coins"] + revision_rewards["coins"],
        "challenge_completed": rewards["challenge_completed"] or revision_rewards["challenge_completed"],
        "messages": rewards["messages"] + revision_rewards["messages"]
    }
    
    if combined_rewards["xp"] > 0 or combined_rewards["coins"] > 0:
        profile = db.get_user_profile(user_id)
        new_xp = profile["xp"] + combined_rewards["xp"]
        new_coins = profile["coins"] + combined_rewards["coins"]
        new_level = (new_xp // 500) + 1
        db.update_user_stats(user_id, new_xp, new_coins, new_level, profile["streak"])
        combined_rewards["new_xp"] = new_xp
        combined_rewards["new_coins"] = new_coins
        combined_rewards["new_level"] = new_level
        
    return jsonify({
        "success": True,
        "summary": summary_data,
        "rewards": combined_rewards
    })


@app.route("/api/quiz", methods=["POST"])
@login_required
def api_quiz():
    """Generates an AI study quiz containing 5 MCQs from PDF or prompt."""
    user_id = session["user_id"]
    extracted_text = None
    subject = ""
    topic = ""
    text = ""
    
    # Check if a file is uploaded in this request
    if 'file' in request.files:
        file = request.files['file']
        if file and file.filename.endswith('.pdf'):
            try:
                file_bytes = file.read()
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                text_content = ""
                for page in doc:
                    text_content += page.get_text()
                extracted_text = text_content.strip()
                pdf_cache[user_id] = extracted_text
            except Exception as e:
                print(f"Error extracting PDF: {e}")
                return jsonify({"success": False, "error": f"Failed to extract PDF text: {e}"}), 400

    # Parse request fields
    if request.form:
        subject = request.form.get("subject", "")
        topic = request.form.get("topic", "")
        text = request.form.get("text", "")
    else:
        try:
            data = request.get_json() or {}
            subject = data.get("subject", "")
            topic = data.get("topic", "")
            text = data.get("text", "")
        except Exception:
            pass

    # If no file uploaded in this request, check if we have cached PDF text from summary step!
    if not extracted_text:
        extracted_text = pdf_cache.get(user_id)

    if extracted_text:
        source_content = extracted_text
        is_pdf = True
    else:
        source_content = text if text else f"Subject: {subject}, Topic: {topic}"
        is_pdf = False

    if not source_content or source_content.strip() == "Subject: , Topic: ":
        return jsonify({"success": False, "error": "Provide PDF file, text, or subject/topic details"}), 400
        
    quiz_data = ai.generate_study_quiz(source_content, subject, topic, is_pdf=is_pdf)
    return jsonify({"success": True, "quiz": quiz_data["quiz"]})


@app.route("/api/badges/purchase", methods=["POST"])
@login_required
def api_purchase_badge():
    """Deducts coins and saves purchased badges."""
    user_id = session["user_id"]
    data = request.get_json() or {}
    badge_id = data.get("badge_id")
    price = int(data.get("price", 0))
    
    if not badge_id or price <= 0:
        return jsonify({"success": False, "error": "Invalid request parameters"}), 400
        
    profile = db.get_user_profile(user_id)
    if not profile:
        return jsonify({"success": False, "error": "User profile not found"}), 404
        
    # Get currently owned badges
    owned_badges = [b.strip() for b in (profile.get("badges") or "freshman").split(",") if b.strip()]
    
    if badge_id in owned_badges:
        return jsonify({"success": False, "error": "Badge already owned"}), 400
        
    current_coins = profile.get("coins", 0)
    if current_coins < price:
        return jsonify({"success": False, "error": "Insufficient coins"}), 400
        
    # Deduct coins and add badge
    new_coins = current_coins - price
    owned_badges.append(badge_id)
    badges_str = ",".join(owned_badges)
    
    # Save to database
    db.update_user_badges_and_coins(user_id, badges_str, new_coins)
    
    return jsonify({
        "success": True, 
        "new_coins": new_coins, 
        "badges": badges_str
    })


@app.route("/api/rewards", methods=["POST"])
@login_required
def api_rewards():
    """Claims rewards for completing quizzes or study milestones."""
    user_id = session["user_id"]
    data = request.get_json() or {}
    action = data.get("action")
    
    if action == "quiz_complete":
        score = int(data.get("score", 0))
        # 20 XP and 5 Coins per correct answer
        xp_earned = score * 20
        coins_earned = score * 5
        
        # Increment 'quiz' challenge progress
        challenge_rewards = db.update_challenge_progress(user_id, "quiz", 1)
        
        xp_earned += challenge_rewards["xp"]
        coins_earned += challenge_rewards["coins"]
        
        profile = db.get_user_profile(user_id)
        new_xp = profile["xp"] + xp_earned
        new_coins = profile["coins"] + coins_earned
        new_level = (new_xp // 500) + 1
        
        db.update_user_stats(user_id, new_xp, new_coins, new_level, profile["streak"])
        
        return jsonify({
            "success": True,
            "xp_earned": xp_earned,
            "coins_earned": coins_earned,
            "new_xp": new_xp,
            "new_coins": new_coins,
            "new_level": new_level,
            "challenge_completed": challenge_rewards["challenge_completed"],
            "messages": challenge_rewards["messages"]
        })
        
    elif action == "study_timer":
        # Check off progress towards daily "study" challenge
        minutes = int(data.get("minutes", 10))
        challenge_rewards = db.update_challenge_progress(user_id, "study", minutes)
        
        profile = db.get_user_profile(user_id)
        xp_earned = challenge_rewards["xp"]
        coins_earned = challenge_rewards["coins"]
        
        # Award study time directly: 1 XP per minute studied
        xp_earned += minutes
        
        new_xp = profile["xp"] + xp_earned
        new_coins = profile["coins"] + coins_earned
        new_level = (new_xp // 500) + 1
        
        db.update_user_stats(user_id, new_xp, new_coins, new_level, profile["streak"])
        
        return jsonify({
            "success": True,
            "xp_earned": xp_earned,
            "coins_earned": coins_earned,
            "new_xp": new_xp,
            "new_coins": new_coins,
            "new_level": new_level,
            "challenge_completed": challenge_rewards["challenge_completed"],
            "messages": challenge_rewards["messages"]
        })
        
    return jsonify({"success": False, "error": "Invalid action"}), 400


@app.route("/api/analytics/history", methods=["GET"])
@login_required
def api_analytics_history():
    """Returns actual study and task completion history for the last 7 days."""
    user_id = session["user_id"]
    history = db.get_weekly_history(user_id)
    return jsonify({"success": True, "history": history})


@app.route("/api/config")
def api_config():
    """Exposes public Supabase credentials or configures Mock Mode."""
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_ANON_KEY", "")
    is_mock = not (url and key and "YOUR_SUPABASE" not in url)
    return jsonify({
        "supabaseUrl": url,
        "supabaseKey": key,
        "isMock": is_mock
    })


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
