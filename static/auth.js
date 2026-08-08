/* ==========================================================================
   STUDYSYNC AI - AUTHENTICATION MANAGER (SUPABASE & MOCK CONFIG)
   ========================================================================== */

let supabaseClient = null;
let isMockMode = true;

// Expose Auth API globally
window.StudySyncAuth = {
    getSupabaseClient: function() {
        return supabaseClient;
    },
    isMockMode: function() {
        return isMockMode;
    },
    init: async function() {
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            
            if (config.isMock) {
                isMockMode = true;
                console.log("StudySync Auth: Initialized in LOCAL DEMO MODE.");
            } else {
                isMockMode = false;
                // Supabase library is loaded via CDN on index.html
                if (window.supabase) {
                    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
                    console.log("StudySync Auth: Initialized live SUPABASE client.");
                } else {
                    console.warn("Supabase CDN not loaded. Defaulting to mock auth.");
                    isMockMode = true;
                }
            }
            this.bindEvents();
        } catch (e) {
            console.error("Auth initialization failed. Running mock auth.", e);
            isMockMode = true;
            this.bindEvents();
        }
    },

    bindEvents: function() {
        // Find auth elements
        const formLogin = document.getElementById('form-login');
        const formSignup = document.getElementById('form-signup');
        const btnLogout = document.getElementById('btn-logout');
        const quickDemoBtn = document.getElementById('btn-quick-demo-login');

        if (formLogin) {
            formLogin.addEventListener('submit', (e) => this.handleLogin(e));
        }
        if (formSignup) {
            formSignup.addEventListener('submit', (e) => this.handleSignup(e));
        }
        if (btnLogout) {
            btnLogout.addEventListener('click', (e) => this.handleLogout(e));
        }
        if (quickDemoBtn) {
            quickDemoBtn.addEventListener('click', () => this.handleQuickDemoLogin());
        }
    },

    // --- LOG IN ACTION ---
    handleLogin: async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const submitBtn = document.getElementById('login-submit-btn');

        this.setLoading(submitBtn, true);

        try {
            let userId = "";
            let fullName = "Student";
            let academicData = {};

            if (isMockMode) {
                // Mock Authentication
                const users = JSON.parse(localStorage.getItem('studysync_users') || '{}');
                const user = users[email.toLowerCase()];
                
                if (!user || user.password !== password) {
                    throw new Error("Invalid email or password. (Hint: Register first!)");
                }
                
                userId = user.id;
                fullName = user.fullName;
                academicData = user;
            } else {
                // Live Supabase Authenticate with automatic local fallback
                try {
                    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                    
                    userId = data.user.id;
                    
                    // Get additional user info from database
                    try {
                        const profileRes = await fetch(`/api/profile`); // session-based check if already logged in on flask
                        if (profileRes.ok) {
                            const profileData = await profileRes.json();
                            fullName = profileData.user.full_name;
                            academicData = {
                                college: profileData.user.college,
                                course: profileData.user.course,
                                yearSemester: profileData.user.year_semester,
                                subjects: profileData.user.subjects
                            };
                        }
                    } catch (pe) {
                        console.log("Could not fetch profile, sending defaults.", pe);
                    }
                } catch (supabaseError) {
                    console.warn("Supabase auth offline. Falling back to local credentials.", supabaseError);
                    const users = JSON.parse(localStorage.getItem('studysync_users') || '{}');
                    const user = users[email.toLowerCase()];
                    
                    if (!user || user.password !== password) {
                        throw new Error("Invalid credentials or connection issue. Hint: Register first or try a different account!");
                    }
                    
                    userId = user.id;
                    fullName = user.fullName;
                    academicData = user;
                }
            }

            // Sync session with Flask backend
            const sessionPayload = {
                userId,
                email,
                fullName,
                college: academicData.college || "Stanford University",
                course: academicData.course || "B.S. Computer Science",
                yearSemester: academicData.yearSemester || "Year 2, Sem 3",
                subjects: academicData.subjects || "Data Structures, DBMS, Operating Systems"
            };

            const syncResponse = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sessionPayload)
            });

            const syncResult = await syncResponse.json();

            if (syncResult.success) {
                window.StudySyncUI.showToast("Logged in successfully! Loading cockpit...", "success");
                setTimeout(() => window.location.href = '/dashboard', 1000);
            } else {
                throw new Error("Session sync failed: " + syncResult.error);
            }
        } catch (error) {
            window.StudySyncUI.showToast(error.message || "Login failed", "error");
        } finally {
            this.setLoading(submitBtn, false);
        }
    },

    // --- SIGN UP ACTION ---
    handleSignup: async function(e) {
        e.preventDefault();
        const fullName = document.getElementById('signup-fullname').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const college = document.getElementById('signup-college').value.trim();
        const course = document.getElementById('signup-course').value.trim();
        const yearSemester = document.getElementById('signup-semester').value.trim();
        const subjects = document.getElementById('signup-subjects').value.trim();
        const submitBtn = document.getElementById('signup-submit-btn');

        if (password.length < 6) {
            window.StudySyncUI.showToast("Password must be at least 6 characters.", "error");
            return;
        }

        this.setLoading(submitBtn, true);

        try {
            let userId = "";

            if (isMockMode) {
                // Mock Register
                const users = JSON.parse(localStorage.getItem('studysync_users') || '{}');
                if (users[email.toLowerCase()]) {
                    throw new Error("Email already registered. Try logging in!");
                }
                
                userId = 'mock-' + Math.random().toString(36).substr(2, 9);
                users[email.toLowerCase()] = {
                    id: userId,
                    email,
                    password,
                    fullName,
                    college,
                    course,
                    yearSemester,
                    subjects
                };
                localStorage.setItem('studysync_users', JSON.stringify(users));
            } else {
                // Live Supabase Sign Up with automatic local fallback
                try {
                    const { data, error } = await supabaseClient.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                full_name: fullName
                            }
                        }
                    });
                    
                    if (error) throw error;
                    if (!data.user) throw new Error("Registration failed.");
                    userId = data.user.id;
                } catch (supabaseError) {
                    console.warn("Supabase registration offline. Registering locally instead.", supabaseError);
                    userId = 'mock-' + Math.random().toString(36).substr(2, 9);
                    const users = JSON.parse(localStorage.getItem('studysync_users') || '{}');
                    users[email.toLowerCase()] = {
                        id: userId,
                        email,
                        password,
                        fullName,
                        college,
                        course,
                        yearSemester,
                        subjects
                    };
                    localStorage.setItem('studysync_users', JSON.stringify(users));
                }
            }

            // Sync session with Flask backend
            const sessionPayload = {
                userId,
                email,
                fullName,
                college,
                course,
                yearSemester,
                subjects
            };

            const syncResponse = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sessionPayload)
            });

            const syncResult = await syncResponse.json();

            if (syncResult.success) {
                window.StudySyncUI.showToast("Workspace registered successfully!", "success");
                if (window.confetti) {
                    window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
                }
                setTimeout(() => window.location.href = '/dashboard', 1200);
            } else {
                throw new Error("Session synchronization failed: " + syncResult.error);
            }
        } catch (error) {
            window.StudySyncUI.showToast(error.message || "Registration failed", "error");
        } finally {
            this.setLoading(submitBtn, false);
        }
    },

    // --- QUICK DEMO LOGIN (HACKATHON) ---
    handleQuickDemoLogin: async function() {
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        
        emailInput.value = "judge@university.edu";
        passwordInput.value = "password123";
        
        const sessionPayload = {
            userId: "demo-hackathon-judge",
            email: "judge@university.edu",
            fullName: "Hackathon Judge",
            college: "Stanford University",
            course: "B.S. Computer Science",
            yearSemester: "Year 2, Sem 3",
            subjects: "Data Structures, DBMS, Operating Systems"
        };
        
        window.StudySyncUI.showToast("Initializing Hackathon Judge workspace...", "info");
        
        try {
            if (!isMockMode && supabaseClient) {
                try {
                    await supabaseClient.auth.signUp({
                        email: "judge@university.edu",
                        password: "password123",
                        options: { data: { full_name: "Hackathon Judge" } }
                    });
                } catch(e) {}
                
                try {
                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email: "judge@university.edu",
                        password: "password123"
                    });
                    if (data && data.user) {
                        sessionPayload.userId = data.user.id;
                    }
                } catch(e) {}
            } else {
                const users = JSON.parse(localStorage.getItem('studysync_users') || '{}');
                users["judge@university.edu"] = {
                    id: "demo-hackathon-judge",
                    email: "judge@university.edu",
                    password: "password123",
                    fullName: "Hackathon Judge",
                    college: "Stanford University",
                    course: "B.S. Computer Science",
                    yearSemester: "Year 2, Sem 3",
                    subjects: "Data Structures, DBMS, Operating Systems"
                };
                localStorage.setItem('studysync_users', JSON.stringify(users));
            }
            
            const syncResponse = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sessionPayload)
            });

            const syncResult = await syncResponse.json();
            if (syncResult.success) {
                window.StudySyncUI.showToast("Logged in successfully! Loading cockpit...", "success");
                if (window.confetti) {
                    window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
                }
                setTimeout(() => window.location.href = '/dashboard', 1000);
            } else {
                throw new Error("Session sync failed: " + syncResult.error);
            }
        } catch(err) {
            console.warn("Auth failed, forcing local session creation.", err);
            // Fallback: Force session sync and redirect
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sessionPayload)
            });
            window.location.href = '/dashboard';
        }
    },

    // --- LOG OUT ACTION ---
    handleLogout: async function(e) {
        if (e) e.preventDefault();
        try {
            if (!isMockMode && supabaseClient) {
                await supabaseClient.auth.signOut();
            }
            window.location.href = '/logout';
        } catch (err) {
            console.error("Logout failed, redirecting anyway.", err);
            window.location.href = '/logout';
        }
    },

    // --- HELPER METRICS ---
    setLoading: function(button, isLoading) {
        if (!button) return;
        const textSpan = button.querySelector('.btn-text');
        const spinner = button.querySelector('.spinner');
        
        if (isLoading) {
            button.disabled = true;
            if (textSpan) textSpan.classList.add('hide');
            if (spinner) spinner.classList.remove('hide');
        } else {
            button.disabled = false;
            if (textSpan) textSpan.classList.remove('hide');
            if (spinner) spinner.classList.add('hide');
        }
    }
};

// Initialize Auth on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.StudySyncAuth.init();
});
