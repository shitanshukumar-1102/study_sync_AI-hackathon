/* ==========================================================================
   STUDYSYNC AI - PRIMARY FRONTEND LOGIC & COMPONENT CONTROLLER
   ========================================================================== */

// Global State
let userProfile = null;
let activeRoomBotInterval = null;
let activeChatChannel = null;
const chatSessionId = 'session-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
let chatPollInterval = null;
const renderedMessageIds = new Set();

window.StudySyncUI = {
    // --- INITIALIZATION ---
    init: function() {
        this.initTheme();
        this.initNavigation();
        this.initAuthModals();
        
        // Page specific initializers
        if (document.getElementById('task-list')) {
            this.initDashboard();
        }
        if (document.getElementById('challenges-page-list')) {
            this.initChallengesPage();
        }
        if (document.getElementById('badge-shop-container')) {
            this.initProfilePage();
        }

        // Render Lucide Icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Global click listener for satisfying UI button/link sound effects
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, .nav-link, .mobile-nav-link, .quiz-option, .task-checkbox-btn');
            if (target) {
                // If it is a task check button, we will play the task sound separately inside the task handler.
                if (target.classList.contains('task-checkbox-btn')) return;
                this.playAudioSynth('click');
            }
        });
    },

    // --- THEME SWITCHER (LIGHT / DARK) ---
    initTheme: function() {
        const themeToggle = document.getElementById('theme-toggle');
        const currentTheme = localStorage.getItem('studysync_theme') || 'dark';
        
        document.documentElement.setAttribute('data-theme', currentTheme);
        
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const activeTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
                
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('studysync_theme', newTheme);
                
                this.showToast(`Switched to ${newTheme} mode`, "info");
            });
        }
    },

    // --- PLAY RETRO SYNTH AUDIO ---
    playAudioSynth: function(type) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            if (type === 'click') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
                
                osc.start();
                osc.stop(ctx.currentTime + 0.06);
            } else if (type === 'task') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12); // G5
                
                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            } else if (type === 'chat') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
                
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
                
                osc.start();
                osc.stop(ctx.currentTime + 0.08);
            } else if (type === 'correct') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
                osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5
                
                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                
                osc.start();
                osc.stop(ctx.currentTime + 0.35);
            } else if (type === 'incorrect') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(180, ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.3);
                
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            } else if (type === 'fanfare') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                const now = ctx.currentTime;
                osc.frequency.setValueAtTime(261.63, now); // C4
                osc.frequency.setValueAtTime(329.63, now + 0.08); // E4
                osc.frequency.setValueAtTime(392.00, now + 0.16); // G4
                osc.frequency.setValueAtTime(523.25, now + 0.24); // C5
                
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
                
                osc.start();
                osc.stop(now + 0.55);
            }
        } catch (e) {
            console.warn("AudioContext block:", e);
        }
    },

    // --- NAVIGATION MENU ---
    initNavigation: function() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (menuBtn && mobileMenu) {
            menuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hide');
                mobileMenu.classList.contains('hide') ? 
                    menuBtn.innerHTML = '<i data-lucide="menu"></i>' : 
                    menuBtn.innerHTML = '<i data-lucide="x"></i>';
                if (window.lucide) window.lucide.createIcons();
            });
        }
    },

    // --- AUTHENTICATION MODALS FLOW ---
    initAuthModals: function() {
        const modal = document.getElementById('auth-modal');
        const closeBtn = document.getElementById('modal-close-btn');
        
        // Trigger buttons
        const triggerLogin = document.getElementById('btn-login-trigger');
        const triggerSignup = document.getElementById('btn-signup-trigger');
        const mobileLogin = document.getElementById('mobile-login-trigger');
        const mobileSignup = document.getElementById('mobile-signup-trigger');
        const heroGetStarted = document.getElementById('hero-get-started');
        
        // Tab controls
        const tabLogin = document.getElementById('tab-login');
        const tabSignup = document.getElementById('tab-signup');
        const formLoginWrapper = document.getElementById('form-login-wrapper');
        const formSignupWrapper = document.getElementById('form-signup-wrapper');

        const openAuth = (tab) => {
            if (!modal) return;
            modal.classList.add('active');
            switchTab(tab);
        };

        const closeAuth = () => {
            if (!modal) return;
            modal.classList.remove('active');
        };

        const switchTab = (tab) => {
            if (tab === 'login') {
                tabLogin.classList.add('active');
                tabSignup.classList.remove('active');
                formLoginWrapper.classList.add('active');
                formSignupWrapper.classList.remove('active');
            } else {
                tabSignup.classList.add('active');
                tabLogin.classList.remove('active');
                formSignupWrapper.classList.add('active');
                formLoginWrapper.classList.remove('active');
            }
        };

        if (triggerLogin) triggerLogin.addEventListener('click', () => openAuth('login'));
        if (triggerSignup) triggerSignup.addEventListener('click', () => openAuth('signup'));
        if (mobileLogin) mobileLogin.addEventListener('click', () => openAuth('login'));
        if (mobileSignup) mobileSignup.addEventListener('click', () => openAuth('signup'));
        if (heroGetStarted) heroGetStarted.addEventListener('click', () => openAuth('signup'));
        
        if (closeBtn) closeBtn.addEventListener('click', closeAuth);
        
        if (tabLogin) tabLogin.addEventListener('click', () => switchTab('login'));
        if (tabSignup) tabSignup.addEventListener('click', () => switchTab('signup'));

        // Handle auto-opens from Flask params
        if (typeof initialOpenModal !== 'undefined' && initialOpenModal) {
            openAuth(initialOpenModal);
        }

        // Close on clicking overlay
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeAuth();
            });
        }
    },

    // --- DASHBOARD COCKPIT ENGINE ---
    initDashboard: function() {
        this.initAnalyticsChart();
        this.loadTasks();
        this.loadChallengePreview();
        this.initAIStudySpace();
        this.initPomodoroTimer();
        
        // Add Task Form Listener
        const addTaskForm = document.getElementById('add-task-form');
        if (addTaskForm) {
            addTaskForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('task-title').value.trim();
                const priority = document.getElementById('task-priority').value;
                const category = document.getElementById('task-category').value;
                const dueDate = document.getElementById('task-due').value || null;
                
                try {
                    const result = await window.StudySyncAPI.createTask(title, priority, category, dueDate);
                    if (result.success) {
                        this.showToast("Task added successfully!", "success");
                        document.getElementById('task-title').value = "";
                        this.loadTasks();
                        this.loadChallengePreview(); // reload challenges progress
                    } else {
                        this.showToast(result.error || "Failed to create task", "error");
                    }
                } catch (err) {
                    this.showToast("Error creating task", "error");
                }
            });
        }

        // Sync local stats display
        this.refreshGlobalProfileStats();
    },

    // --- POMODORO COUNTDOWN TIMER ---
    initPomodoroTimer: function() {
        const timeDisplay = document.getElementById('focus-time-display');
        const btnStart = document.getElementById('btn-start-focus');
        const btnPause = document.getElementById('btn-pause-focus');
        const btnReset = document.getElementById('btn-reset-focus');
        const btnLog = document.getElementById('btn-log-focus');
        
        if (!timeDisplay) return;
        
        let timerSeconds = 1500; // 25 minutes default
        let timerInterval = null;
        let isRunning = false;
        
        const updateDisplay = () => {
            const minutes = Math.floor(timerSeconds / 60);
            const seconds = timerSeconds % 60;
            timeDisplay.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };
        
        btnStart.addEventListener('click', () => {
            if (isRunning) return;
            isRunning = true;
            btnStart.classList.add('hide');
            btnPause.classList.remove('hide');
            btnLog.classList.remove('hide');
            
            timerInterval = setInterval(() => {
                if (timerSeconds > 0) {
                    timerSeconds--;
                    updateDisplay();
                } else {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    isRunning = false;
                    btnStart.classList.remove('hide');
                    btnPause.classList.add('hide');
                    
                    // Auto-log 25 minutes on completion!
                    logStudyMinutes(25);
                }
            }, 1000);
        });
        
        btnPause.addEventListener('click', () => {
            if (!isRunning) return;
            isRunning = false;
            clearInterval(timerInterval);
            timerInterval = null;
            btnStart.classList.remove('hide');
            btnPause.classList.add('hide');
        });
        
        btnReset.addEventListener('click', () => {
            isRunning = false;
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            timerSeconds = 1500;
            updateDisplay();
            btnStart.classList.remove('hide');
            btnPause.classList.add('hide');
            btnLog.classList.add('hide');
        });
        
        btnLog.addEventListener('click', () => {
            // Log 10 minutes studied immediately to show graph raise!
            timerSeconds += 10 * 60;
            updateDisplay();
            logStudyMinutes(10);
        });
        
        const logStudyMinutes = async (minutes) => {
            btnLog.disabled = true;
            const origHTML = btnLog.innerHTML;
            btnLog.innerHTML = `<div class="spinner" style="width:12px; height:12px; border-width:1.5px; border-top-color:#f97316;"></div> Logged`;
            
            try {
                const res = await fetch('/api/rewards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'study_timer', minutes: minutes })
                });
                
                const resData = await res.json();
                if (resData.success) {
                    this.showToast(`Logged ${minutes} minutes of study!`, "success");
                    
                    if (window.confetti) {
                        window.confetti({ particleCount: 80, spread: 50 });
                    }
                    
                    // Refresh stats
                    this.refreshGlobalProfileStats();
                    this.loadChallengePreview();
                    
                    // Re-render task count & chart to update graph instantly!
                    this.loadTasks();
                }
            } catch (err) {
                this.showToast("Failed to log study minutes", "error");
            } finally {
                btnLog.disabled = false;
                btnLog.innerHTML = origHTML;
            }
        };
    },

    // --- TASKS LOADER & RENDERING ---
    loadTasks: async function() {
        const listContainer = document.getElementById('task-list');
        if (!listContainer) return;

        try {
            const data = await window.StudySyncAPI.getTasks();
            if (data.success) {
                listContainer.innerHTML = "";
                const tasks = data.tasks;
                
                if (tasks.length === 0) {
                    listContainer.innerHTML = `
                        <div class="empty-state">
                            <i data-lucide="info" style="margin-bottom: 8px; opacity: 0.5;"></i>
                            <p>No study tasks today. Put down a goal and check it off!</p>
                        </div>`;
                    if (window.lucide) window.lucide.createIcons();
                    this.updateTaskProgressBar(0, 0);
                    return;
                }

                let completedCount = 0;
                tasks.forEach(task => {
                    const isTaskChecked = !!task.completed;
                    if (isTaskChecked) {
                        completedCount++;
                    }
                    
                    const div = document.createElement('div');
                    div.className = `task-item ${isTaskChecked ? 'completed' : ''}`;
                    div.dataset.id = task.id;
                    
                    // Format Date
                    let dateHTML = "";
                    if (task.due_date) {
                        const d = new Date(task.due_date);
                        dateHTML = `<span class="task-due-date"><i data-lucide="calendar" class="icon-sm"></i> ${d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>`;
                    }
                    
                    div.innerHTML = `
                        <div class="task-item-left">
                            <button class="task-checkbox-btn ${isTaskChecked ? 'checked' : ''}" aria-label="Toggle task completed">
                                <i data-lucide="check" class="check-icon"></i>
                            </button>
                            <div class="task-info">
                                <span class="task-title">${this.escapeHTML(task.title)}</span>
                                <div class="task-meta-tags">
                                    <span class="tag tag-prio-${task.priority.toLowerCase()}">${task.priority}</span>
                                    <span class="tag tag-cat">${task.category}</span>
                                    ${dateHTML}
                                </div>
                            </div>
                        </div>
                        <button class="btn-icon-danger btn-delete-task" aria-label="Delete task">
                            <i data-lucide="trash-2"></i>
                        </button>
                    `;
                    listContainer.appendChild(div);
                });

                // Attach checkbox listeners
                listContainer.querySelectorAll('.task-checkbox-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const item = btn.closest('.task-item');
                        const id = item.dataset.id;
                        const wasCompleted = btn.classList.contains('checked');
                        const nowCompleted = !wasCompleted;
                        
                        btn.classList.toggle('checked', nowCompleted);
                        item.classList.toggle('completed', nowCompleted);
                        
                        // Optimistic UI progress bar & chart updates
                        const total = listContainer.querySelectorAll('.task-item').length;
                        const completed = listContainer.querySelectorAll('.task-checkbox-btn.checked').length;
                        this.updateTaskProgressBar(completed, total);
                        
                        let studyMinutes = 0;
                        try {
                            const studyChalText = document.querySelector('.prev-fraction');
                            if (studyChalText) {
                                studyMinutes = parseInt(studyChalText.innerText.split('/')[0]) || 0;
                            }
                        } catch(e) {}
                        
                        this.updateAnalyticsChart(studyMinutes, completed);
                        
                        try {
                            const res = await window.StudySyncAPI.updateTask(id, nowCompleted);
                            if (res.success) {
                                if (nowCompleted) {
                                    this.playAudioSynth('task');
                                    this.showToast(`Completed! Earned +${res.rewards.xp} XP and +${res.rewards.coins} Coins`, "success");
                                    if (res.rewards.challenge_completed) {
                                        this.showAchievement("Daily Quest Complete!", "You checked off a daily target challenge", 50, 10);
                                    }
                                    this.refreshGlobalProfileStats();
                                }
                                this.loadChallengePreview();
                            }
                        } catch (err) {
                            // Revert on connection error
                            btn.classList.toggle('checked', wasCompleted);
                            item.classList.toggle('completed', wasCompleted);
                            
                            const revertedCompleted = listContainer.querySelectorAll('.task-checkbox-btn.checked').length;
                            this.updateTaskProgressBar(revertedCompleted, total);
                            this.updateAnalyticsChart(studyMinutes, revertedCompleted);
                            
                            this.showToast("Connection issue updating task", "error");
                        }
                    });
                });

                // Attach delete listeners
                listContainer.querySelectorAll('.btn-delete-task').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const item = btn.closest('.task-item');
                        const id = item.dataset.id;
                        if (confirm("Are you sure you want to remove this task?")) {
                            const res = await window.StudySyncAPI.deleteTask(id);
                            if (res.success) {
                                this.showToast("Task removed", "info");
                                this.loadTasks();
                                this.loadChallengePreview();
                            }
                        }
                    });
                });

                if (window.lucide) window.lucide.createIcons();
                this.updateTaskProgressBar(completedCount, tasks.length);
                
                // Dynamically update analytics chart data for today
                let studyMinutes = 0;
                try {
                    const chalRes = await window.StudySyncAPI.getChallenges();
                    if (chalRes.success) {
                        const studyChal = chalRes.challenges.find(c => c.type === 'study');
                        if (studyChal) studyMinutes = studyChal.progress || 0;
                    }
                } catch(e) {
                    console.log("Could not load study minutes for chart", e);
                }
                
                this.updateAnalyticsChart(studyMinutes, completedCount);
            }
        } catch (err) {
            console.error("Failed to load tasks", err);
        }
    },

    updateTaskProgressBar: function(completed, total) {
        const bar = document.getElementById('task-progress-bar');
        const text = document.getElementById('task-completed-ratio');
        if (text) text.innerText = `${completed}/${total} Completed`;
        
        if (bar) {
            const percentage = total > 0 ? (completed / total) * 100 : 0;
            bar.style.width = `${percentage}%`;
        }
    },

    // --- DAILY CHALLENGES PREVIEW ---
    loadChallengePreview: async function() {
        const previewContainer = document.getElementById('challenge-preview-container');
        if (!previewContainer) return;

        try {
            const res = await window.StudySyncAPI.getChallenges();
            if (res.success && res.challenges.length > 0) {
                previewContainer.innerHTML = "";
                // Show first 2 challenges on dashboard preview
                res.challenges.slice(0, 2).forEach(chal => {
                    const row = document.createElement('div');
                    row.className = "challenge-prev-row";
                    
                    const pct = Math.min((chal.progress / chal.target) * 100, 100);
                    
                    row.innerHTML = `
                        <div class="prev-top">
                            <span class="prev-title">${chal.title}</span>
                            <span class="prev-points">+${chal.xp_reward} XP</span>
                        </div>
                        <div class="prev-bar-box">
                            <div class="prev-track">
                                <div class="prev-bar" style="width: ${pct}%"></div>
                            </div>
                            <span class="prev-fraction">${chal.progress}/${chal.target}</span>
                        </div>
                    `;
                    previewContainer.appendChild(row);
                });
            }
        } catch (e) {
            previewContainer.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">Unable to load active challenges.</p>`;
        }
    },

    // --- AI GENERATOR SPACE ---
    initAIStudySpace: function() {
        const tabOpt1 = document.getElementById('tab-option-1');
        const tabOpt2 = document.getElementById('tab-option-2');
        const paneOpt1 = document.getElementById('pane-option-1');
        const paneOpt2 = document.getElementById('pane-option-2');
        
        // Study file input
        const studyFile = document.getElementById('study-file');
        const fileNameDisplay = document.getElementById('file-name-display');
        const selectedFileName = document.getElementById('selected-file-name');
        const removeFileBtn = document.getElementById('remove-file-btn');
        
        // Custom Subject Toggle listener
        const selectSubject1 = document.getElementById('select-subject-1');
        const customSubjectWrapper = document.getElementById('custom-subject-wrapper-1');
        if (selectSubject1 && customSubjectWrapper) {
            selectSubject1.addEventListener('change', () => {
                if (selectSubject1.value === "Other") {
                    customSubjectWrapper.classList.remove('hide');
                } else {
                    customSubjectWrapper.classList.add('hide');
                }
            });
        }

        // Toggling panes
        if (tabOpt1 && tabOpt2) {
            tabOpt1.addEventListener('click', () => {
                tabOpt1.classList.add('active');
                tabOpt2.classList.remove('active');
                paneOpt1.classList.add('active');
                paneOpt2.classList.remove('active');
            });
            tabOpt2.addEventListener('click', () => {
                tabOpt2.classList.add('active');
                tabOpt1.classList.remove('active');
                paneOpt2.classList.add('active');
                paneOpt1.classList.remove('active');
            });
        }

        // File Selection mockup
        if (studyFile) {
            studyFile.addEventListener('change', (e) => {
                if (studyFile.files.length > 0) {
                    selectedFileName.innerText = studyFile.files[0].name;
                    fileNameDisplay.classList.remove('hide');
                    document.querySelector('.file-drop-area').classList.add('hide');
                }
            });
        }
        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', () => {
                studyFile.value = "";
                fileNameDisplay.classList.add('hide');
                document.querySelector('.file-drop-area').classList.remove('hide');
            });
        }

        // AI Core Action Buttons
        const btnGenSummary = document.getElementById('btn-generate-summary');
        const btnGenQuiz = document.getElementById('btn-generate-quiz');
        const btnPromptSummary = document.getElementById('btn-prompt-summary');
        const btnPromptQuiz = document.getElementById('btn-prompt-quiz');
 
        // Connect clicks
        if (btnGenSummary) {
            btnGenSummary.addEventListener('click', () => {
                let subject = document.getElementById('select-subject-1').value;
                if (subject === "Other") {
                    subject = document.getElementById('input-custom-subject-1').value.trim();
                }
                const topic = document.getElementById('input-topic-1').value.trim();
                const text = document.getElementById('upload-text').value.trim();
                const studyFile = document.getElementById('study-file');
                
                if (!subject || !topic) {
                    this.showToast("Please pick a subject and specify a topic name.", "error");
                    return;
                }
                
                if (studyFile && studyFile.files.length > 0) {
                    const formData = new FormData();
                    formData.append('file', studyFile.files[0]);
                    formData.append('subject', subject);
                    formData.append('topic', topic);
                    formData.append('text', text);
                    this.triggerSummaryGeneration(formData, subject, topic, btnGenSummary);
                } else {
                    const payload = { text, subject, topic };
                    this.triggerSummaryGeneration(payload, subject, topic, btnGenSummary);
                }
            });
        }
        
        if (btnGenQuiz) {
            btnGenQuiz.addEventListener('click', () => {
                let subject = document.getElementById('select-subject-1').value;
                if (subject === "Other") {
                    subject = document.getElementById('input-custom-subject-1').value.trim();
                }
                const topic = document.getElementById('input-topic-1').value.trim();
                const text = document.getElementById('upload-text').value.trim();
                const studyFile = document.getElementById('study-file');
                
                if (!subject || !topic) {
                    this.showToast("Please pick a subject and specify a topic name.", "error");
                    return;
                }
                
                if (studyFile && studyFile.files.length > 0) {
                    const formData = new FormData();
                    formData.append('file', studyFile.files[0]);
                    formData.append('subject', subject);
                    formData.append('topic', topic);
                    formData.append('text', text);
                    this.triggerQuizGeneration(formData, subject, topic, btnGenQuiz);
                } else {
                    const payload = { text, subject, topic };
                    this.triggerQuizGeneration(payload, subject, topic, btnGenQuiz);
                }
            });
        }
 
        if (btnPromptSummary) {
            btnPromptSummary.addEventListener('click', () => {
                const subject = document.getElementById('input-subject-2').value.trim();
                const topic = document.getElementById('input-topic-2').value.trim();
                const prompt = document.getElementById('custom-prompt').value.trim();
                
                if (!subject || !topic) {
                    this.showToast("Please enter a subject and topic name.", "error");
                    return;
                }
                const payload = { text: prompt, subject, topic };
                this.triggerSummaryGeneration(payload, subject, topic, btnPromptSummary);
            });
        }
 
        if (btnPromptQuiz) {
            btnPromptQuiz.addEventListener('click', () => {
                const subject = document.getElementById('input-subject-2').value.trim();
                const topic = document.getElementById('input-topic-2').value.trim();
                const prompt = document.getElementById('custom-prompt').value.trim();
                
                if (!subject || !topic) {
                    this.showToast("Please enter a subject and topic name.", "error");
                    return;
                }
                const payload = { text: prompt, subject, topic };
                this.triggerQuizGeneration(payload, subject, topic, btnPromptQuiz);
            });
        }
    },
 
    // --- TRIGGER SUMMARY ---
    triggerSummaryGeneration: async function(payload, subject, topic, triggerBtn) {
        const origText = triggerBtn.innerHTML;
        triggerBtn.disabled = true;
        triggerBtn.innerHTML = `<div class="spinner"></div> Processing...`;
        
        this.showToast("Gemini AI is analyzing material...", "info");
 
        try {
            const res = await window.StudySyncAPI.generateSummary(payload);
            if (res.success) {
                this.showToast("Summary generated successfully!", "success");
                
                // Show AI results section
                const outputArea = document.getElementById('ai-output-area');
                const summaryCard = document.getElementById('summary-result-card');
                const quizCard = document.getElementById('quiz-result-card');
                
                outputArea.classList.remove('hide');
                summaryCard.classList.remove('hide');
                quizCard.classList.add('hide'); // hide quiz if showing summary
 
                // Populate Summary
                document.getElementById('summary-title').innerText = res.summary.title;
                document.getElementById('summary-text-content').innerText = res.summary.summary;
                document.getElementById('summary-revision-notes').innerText = res.summary.revision_notes;
                
                // Key Points bullets
                const list = document.getElementById('summary-key-points');
                list.innerHTML = "";
                res.summary.key_points.forEach(point => {
                    const li = document.createElement('li');
                    li.innerText = point;
                    list.appendChild(li);
                });
                
                // Copy button setup
                const copyBtn = document.getElementById('btn-copy-summary');
                copyBtn.onclick = () => {
                    const fullTxt = `${res.summary.title}\n\nSummary:\n${res.summary.summary}\n\nRevision Notes:\n${res.summary.revision_notes}`;
                    navigator.clipboard.writeText(fullTxt);
                    this.showToast("Copied to clipboard!", "success");
                };
 
                // Close button
                document.getElementById('btn-close-summary').onclick = () => {
                    summaryCard.classList.add('hide');
                    if (quizCard.classList.contains('hide')) outputArea.classList.add('hide');
                };
 
                // Rewards popup
                if (res.rewards && (res.rewards.xp > 0 || res.rewards.coins > 0)) {
                    this.showAchievement("Daily Quest Complete!", "You registered/reviewed today's study summary", res.rewards.xp, res.rewards.coins);
                    this.refreshGlobalProfileStats();
                }
 
                // Scroll to display
                outputArea.scrollIntoView({ behavior: 'smooth' });
                this.loadChallengePreview();
            } else {
                this.showToast(res.error || "Failed to analyze study text.", "error");
            }
        } catch (e) {
            this.showToast("Communication error generating summary", "error");
        } finally {
            triggerBtn.disabled = false;
            triggerBtn.innerHTML = origText;
            if (window.lucide) window.lucide.createIcons();
        }
    },
 
    // --- TRIGGER QUIZ & PLAY GAME ---
    triggerQuizGeneration: async function(payload, subject, topic, triggerBtn) {
        const origText = triggerBtn.innerHTML;
        triggerBtn.disabled = true;
        triggerBtn.innerHTML = `<div class="spinner"></div> Processing...`;
        
        this.showToast("Gemini AI is formulating MCQs...", "info");
 
        try {
            const res = await window.StudySyncAPI.generateQuiz(payload);
            if (res.success && res.quiz.length > 0) {
                this.showToast("AI Quiz generated!", "success");
                
                const outputArea = document.getElementById('ai-output-area');
                const summaryCard = document.getElementById('summary-result-card');
                const quizCard = document.getElementById('quiz-result-card');
                
                outputArea.classList.remove('hide');
                quizCard.classList.remove('hide');
                summaryCard.classList.add('hide'); // hide summary if showing quiz

                // Setup Quiz gameplay state
                let currentIdx = 0;
                let score = 0;
                const questions = res.quiz;

                const loadQuestion = (idx) => {
                    const q = questions[idx];
                    
                    // Header progress
                    document.getElementById('quiz-progress-text').innerText = `Question ${idx + 1} of 5`;
                    document.getElementById('quiz-progress-bar').style.width = `${((idx + 1) / 5) * 100}%`;
                    
                    // Question text
                    document.getElementById('quiz-question-text').innerText = q.question;
                    
                    // Options list
                    const optionsBox = document.getElementById('quiz-options-container');
                    optionsBox.innerHTML = "";
                    
                    // Hide feedback panel
                    const fbBox = document.getElementById('quiz-feedback-box');
                    fbBox.classList.add('hide');
                    
                    // Next btn configuration
                    const nextBtn = document.getElementById('btn-quiz-next');
                    nextBtn.disabled = true;
                    nextBtn.innerHTML = idx === 4 ? `<span>Grade Quiz</span> <i data-lucide="award"></i>` : `<span>Next Question</span> <i data-lucide="arrow-right"></i>`;
                    if (window.lucide) window.lucide.createIcons();

                    q.options.forEach((opt, oIdx) => {
                        const optDiv = document.createElement('div');
                        optDiv.className = "quiz-option";
                        optDiv.innerHTML = `
                            <span class="option-bullet">${String.fromCharCode(65 + oIdx)}</span>
                            <span class="option-text">${this.escapeHTML(opt)}</span>
                        `;
                        
                        optDiv.onclick = () => {
                            // Check answer once
                            if (nextBtn.disabled === false) return; // already selected
                            
                            const isCorrect = oIdx === q.correct_idx;
                            if (isCorrect) {
                                score++;
                                optDiv.classList.add('correct');
                                this.playAudioSynth('correct');
                                this.showToast("Correct choice!", "success");
                            } else {
                                optDiv.classList.add('incorrect');
                                this.playAudioSynth('incorrect');
                                // highlight correct one
                                optionsBox.children[q.correct_idx].classList.add('correct');
                                this.showToast("Incorrect selection.", "error");
                            }
                            
                            // Show feedback panel
                            fbBox.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
                            fbBox.classList.remove('hide');
                            
                            // Set indicators
                            const successIcon = fbBox.querySelector('.feedback-icon-success');
                            const errorIcon = fbBox.querySelector('.feedback-icon-error');
                            const title = document.getElementById('feedback-title');
                            
                            if (isCorrect) {
                                successIcon.classList.remove('hide');
                                errorIcon.classList.add('hide');
                                title.innerText = "Correct Choice!";
                            } else {
                                errorIcon.classList.remove('hide');
                                successIcon.classList.add('hide');
                                title.innerText = "Incorrect Option";
                            }
                            
                            document.getElementById('feedback-text').innerText = q.feedback;
                            if (window.lucide) window.lucide.createIcons();

                            // Unlock Next
                            nextBtn.disabled = false;
                            
                            // Show current score box
                            const scoreBox = document.getElementById('quiz-current-score-box');
                            scoreBox.classList.remove('hide');
                            document.getElementById('quiz-score-num').innerText = score;
                        };
                        optionsBox.appendChild(optDiv);
                    });
                };

                // Close Button
                document.getElementById('btn-close-quiz').onclick = () => {
                    quizCard.classList.add('hide');
                    if (summaryCard.classList.contains('hide')) outputArea.classList.add('hide');
                };

                // Play first question
                loadQuestion(0);

                // Next Button handler
                const nextBtn = document.getElementById('btn-quiz-next');
                nextBtn.onclick = async () => {
                    if (currentIdx < 4) {
                        currentIdx++;
                        loadQuestion(currentIdx);
                    } else {
                        // Game Over! Grade Quiz
                        triggerBtn.disabled = true;
                        
                        try {
                            const gradeRes = await window.StudySyncAPI.claimQuizRewards(score);
                            if (gradeRes.success) {
                                // Close Panel
                                quizCard.classList.add('hide');
                                outputArea.classList.add('hide');
                                
                                // Show Achievement Popup
                                const scorePct = (score / 5) * 100;
                                this.showAchievement(
                                    `Quiz Complete: ${score}/5!`,
                                    `You completed the practice quiz with a score of ${scorePct}%`,
                                    gradeRes.xp_earned,
                                    gradeRes.coins_earned
                                );
                                
                                // Sync stats
                                this.refreshGlobalProfileStats();
                                this.loadChallengePreview();
                            }
                        } catch (er) {
                            this.showToast("Could not record quiz grades.", "error");
                        } finally {
                            triggerBtn.disabled = false;
                        }
                    }
                };

                outputArea.scrollIntoView({ behavior: 'smooth' });
            } else {
                this.showToast("Failed to formulate MCQs", "error");
            }
        } catch (e) {
            this.showToast("Communication error generating quiz", "error");
        } finally {
            triggerBtn.disabled = false;
            triggerBtn.innerHTML = origText;
            if (window.lucide) window.lucide.createIcons();
        }
    },

    // --- PRODUCTIVITY ANALYTICS WIDGET ---
    initAnalyticsChart: function() {
        const ctx = document.getElementById('productivityChart');
        if (!ctx) return;

        // Custom theme variables
        const activeTheme = document.documentElement.getAttribute('data-theme');
        const gridColor = activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(59,130,246,0.08)';
        const labelColor = activeTheme === 'dark' ? '#9ca3af' : '#475569';

        // Generate labels for the last 7 days ending today
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(daysOfWeek[d.getDay()]);
        }

        // Seed realistic static history for the previous 6 days
        this.chartHistoryTasks = [2, 1, 3, 2, 4, 1]; // past 6 days
        this.chartHistoryStudy = [30, 15, 45, 20, 50, 25]; // past 6 days

        this.productivityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Tasks Completed',
                        data: [...this.chartHistoryTasks, 0], // today starts at 0
                        borderColor: '#3b82f6', // Blue line
                        backgroundColor: 'rgba(59, 130, 246, 0.08)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        pointBackgroundColor: '#3b82f6',
                        pointHoverRadius: 7,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Study Time (m)',
                        data: [...this.chartHistoryStudy, 0], // today starts at 0
                        borderColor: '#f97316', // Orange line
                        backgroundColor: 'rgba(249, 115, 22, 0.08)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        pointBackgroundColor: '#f97316',
                        pointHoverRadius: 7,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: labelColor,
                            font: { family: 'Outfit', size: 12 }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: labelColor, font: { family: 'Outfit', weight: '500' } }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: gridColor },
                        ticks: { 
                            color: labelColor, 
                            font: { family: 'Outfit' },
                            stepSize: 1
                        },
                        title: {
                            display: true,
                            text: 'Tasks Completed',
                            color: '#3b82f6',
                            font: { family: 'Outfit', size: 12, weight: 'bold' }
                        },
                        min: 0,
                        suggestedMax: 5
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false }, // avoid duplicate grid lines
                        ticks: { 
                            color: labelColor, 
                            font: { family: 'Outfit' }
                        },
                        title: {
                            display: true,
                            text: 'Study Time (m)',
                            color: '#f97316',
                            font: { family: 'Outfit', size: 12, weight: 'bold' }
                        },
                        min: 0,
                        suggestedMax: 60
                    }
                }
            }
        });

        // Trigger initial update
        this.updateAnalyticsChart();
    },

    updateAnalyticsChart: async function(studyMinutes, tasksCompleted) {
        if (!this.productivityChart) return;
        
        let studyVal = studyMinutes;
        let tasksVal = tasksCompleted;

        // Try reading from DOM if undefined
        if (studyVal === undefined) {
            try {
                const studyChalText = document.querySelector('.prev-fraction');
                if (studyChalText) {
                    studyVal = parseInt(studyChalText.innerText.split('/')[0]) || 0;
                }
            } catch(e) {}
        }
        if (tasksVal === undefined) {
            const listContainer = document.getElementById('task-list');
            if (listContainer) {
                tasksVal = listContainer.querySelectorAll('.task-checkbox-btn.checked').length;
            }
        }

        try {
            // Fetch actual weekly history from the backend
            const res = await window.StudySyncAPI.getAnalyticsHistory();
            if (res.success && res.history.length === 7) {
                let tasksData = res.history.map(h => h.tasks);
                let studyData = res.history.map(h => h.study);
                
                // If the entire fetched database history is 0, fall back to seeded baseline values
                const totalTasks = tasksData.reduce((a, b) => a + b, 0);
                const totalStudy = studyData.reduce((a, b) => a + b, 0);
                
                if (totalTasks === 0 && totalStudy === 0) {
                    tasksData = [...this.chartHistoryTasks, tasksVal || 0];
                    studyData = [...this.chartHistoryStudy, studyVal || 0];
                } else {
                    // Override today's point (index 6) with live optimistic values
                    if (tasksVal !== undefined) tasksData[6] = tasksVal;
                    if (studyVal !== undefined) studyData[6] = studyVal;
                }
                
                this.productivityChart.data.datasets[0].data = tasksData;
                if (this.productivityChart.data.datasets[1]) {
                    this.productivityChart.data.datasets[1].data = studyData;
                }
                this.productivityChart.update();
            }
        } catch(e) {
            console.log("Could not update analytics chart from database history", e);
        }
    },

    // --- REFRESH SIDEBAR STATS ---
    refreshGlobalProfileStats: async function() {
        try {
            const res = await window.StudySyncAPI.getProfile();
            if (res.success) {
                userProfile = res.user;
                
                // Sync Navbar Displays
                const ns = document.getElementById('nav-streak');
                const nc = document.getElementById('nav-coins');
                const ul = document.getElementById('user-level');
                const xt = document.getElementById('xp-text');
                const xpb = document.getElementById('xp-progress-bar');
                
                if (ns) ns.innerText = userProfile.streak;
                if (nc) nc.innerText = userProfile.coins;
                if (ul) ul.innerText = userProfile.level;
                
                if (xt && xpb) {
                    const target = userProfile.level * 500;
                    xt.innerText = `${userProfile.xp} / ${target} XP`;
                    xpb.style.width = `${(userProfile.xp / target) * 100}%`;
                }

                // Sync career statistics displays (if profile page)
                const sx = document.getElementById('stats-xp');
                const ss = document.getElementById('stats-streak');
                const sc = document.getElementById('stats-coins');
                const sl = document.getElementById('stats-level');
                const sbc = document.getElementById('shop-coins-balance');
                
                if (sx) sx.innerText = userProfile.xp;
                if (ss) ss.innerText = userProfile.streak;
                if (sc) sc.innerText = userProfile.coins;
                if (sl) sl.innerText = userProfile.level;
                if (sbc) sbc.innerText = userProfile.coins;
                
                // Trigger auto unlocks (Focus Champion at lvl 2 or 500 XP)
                const focusBadge = document.getElementById('badge-focus-champion');
                if (focusBadge) {
                    if (userProfile.xp >= 500 || userProfile.level > 1) {
                        focusBadge.classList.add('unlocked');
                        focusBadge.querySelector('.badge-status-text').innerText = "Unlocked";
                    } else {
                        focusBadge.classList.add('locked');
                        focusBadge.querySelector('.badge-status-text').innerText = "Locked";
                    }
                }

                // Update badge shop elements based on database state
                if (userProfile.badges) {
                    const ownedBadges = userProfile.badges.split(',').map(b => b.trim());
                    ownedBadges.forEach(badgeId => {
                        const badgeItem = document.querySelector(`.badge-item[data-badge-id="${badgeId}"]`);
                        if (badgeItem) {
                            badgeItem.classList.remove('locked');
                            badgeItem.classList.add('unlocked');
                            
                            const buyBtn = badgeItem.querySelector('.btn-buy-badge');
                            if (buyBtn) buyBtn.classList.add('hide');
                            
                            const statusLabel = badgeItem.querySelector('.badge-status-text');
                            if (statusLabel) {
                                statusLabel.classList.remove('hide');
                                statusLabel.innerText = "Owned";
                            }
                        }
                    });
                }

                // Disable/update buy buttons if insufficient coins
                const currentCoins = userProfile.coins || 0;
                document.querySelectorAll('.badge-item').forEach(badgeItem => {
                    const buyBtn = badgeItem.querySelector('.btn-buy-badge');
                    if (buyBtn) {
                        const badgeId = badgeItem.dataset.badgeId;
                        const ownedBadges = (userProfile.badges || "").split(',').map(b => b.trim());
                        if (ownedBadges.includes(badgeId)) {
                            buyBtn.classList.add('hide');
                            const statusLabel = badgeItem.querySelector('.badge-status-text');
                            if (statusLabel) {
                                statusLabel.classList.remove('hide');
                                statusLabel.innerText = "Owned";
                            }
                        } else {
                            const price = parseInt(badgeItem.dataset.price || 0);
                            if (currentCoins < price) {
                                buyBtn.disabled = true;
                                buyBtn.innerText = `Insufficient Coins`;
                            } else {
                                buyBtn.disabled = false;
                                buyBtn.innerHTML = `<i data-lucide="shopping-cart"></i> Buy for ${price} Coins`;
                                if (window.lucide) window.lucide.createIcons();
                            }
                        }
                    }
                });
            }
        } catch (e) {
            console.log("Failed syncing profile stats", e);
        }
    },


    // --- CHALLENGES PAGE ---
    initChallengesPage: async function() {
        this.loadQuestsList();
        this.initStudyGroupsChat();
        await this.refreshGlobalProfileStats();
        this.loadLeaderboard();
    },

    loadLeaderboard: async function() {
        const container = document.querySelector('.leaderboard-list');
        if (!container) return;

        try {
            const res = await window.StudySyncAPI.getLeaderboard();
            if (res.success && res.leaderboard) {
                const list = res.leaderboard;
                
                // If there are fewer than 3 users, show actual database order or fallback to nice defaults
                const rank1 = list[0] || { full_name: "Sneha Patel", xp: 3120, level: 3, streak: 5 };
                const rank2 = list[1] || { full_name: "Amit Mishra", xp: 2850, level: 2, streak: 4 };
                const rank3 = list[2] || { full_name: "Divya Sharma", xp: 2410, level: 2, streak: 3 };

                // Build podium HTML
                let html = `
                    <div class="leaderboard-podium">
                        <!-- Rank 2 -->
                        <div class="podium-col p-2">
                            <div class="podium-avatar border-silver">
                                <div class="avatar-placeholder">${(rank2.full_name || "AM").slice(0,2).toUpperCase()}</div>
                                <span class="podium-rank">2</span>
                            </div>
                            <span class="podium-name">${this.escapeHTML(rank2.full_name)}</span>
                            <span class="podium-xp text-silver">${rank2.xp.toLocaleString()} XP</span>
                        </div>
                        <!-- Rank 1 -->
                        <div class="podium-col p-1">
                            <div class="podium-avatar border-gold">
                                <div class="avatar-placeholder">${(rank1.full_name || "SP").slice(0,2).toUpperCase()}</div>
                                <i data-lucide="crown" class="crown-icon"></i>
                                <span class="podium-rank">1</span>
                            </div>
                            <span class="podium-name">${this.escapeHTML(rank1.full_name)}</span>
                            <span class="podium-xp text-gold">${rank1.xp.toLocaleString()} XP</span>
                        </div>
                        <!-- Rank 3 -->
                        <div class="podium-col p-3">
                            <div class="podium-avatar border-bronze">
                                <div class="avatar-placeholder">${(rank3.full_name || "DS").slice(0,2).toUpperCase()}</div>
                                <span class="podium-rank">3</span>
                            </div>
                            <span class="podium-name">${this.escapeHTML(rank3.full_name)}</span>
                            <span class="podium-xp text-bronze">${rank3.xp.toLocaleString()} XP</span>
                        </div>
                    </div>

                    <hr class="leaderboard-divider">
                `;

                // Render subsequent users starting from index 3 (Rank 4)
                for (let i = 3; i < list.length; i++) {
                    const user = list[i];
                    const isMe = user.id === (userProfile && (userProfile.id || userProfile.user_id) || "");
                    
                    html += `
                        <div class="leaderboard-item ${isMe ? 'user-item' : ''}">
                            <span class="item-rank">${i + 1}</span>
                            <div class="item-avatar">
                                <div class="avatar-placeholder">${(user.full_name || "ST").slice(0,2).toUpperCase()}</div>
                            </div>
                            <div class="item-details">
                                <span class="item-name">${this.escapeHTML(user.full_name)}${isMe ? ' (You)' : ''}</span>
                                <span class="item-stats">Level ${user.level || 1} • ${user.streak || 0} day streak</span>
                            </div>
                            <span class="item-score">${user.xp.toLocaleString()} XP</span>
                        </div>
                    `;
                }

                container.innerHTML = html;
                if (window.lucide) window.lucide.createIcons();
            }
        } catch(e) {
            console.error("Error loading leaderboard", e);
        }
    },

    loadQuestsList: async function() {
        const list = document.getElementById('challenges-page-list');
        if (!list) return;

        try {
            const data = await window.StudySyncAPI.getChallenges();
            if (data.success && data.challenges.length > 0) {
                list.innerHTML = "";
                
                data.challenges.forEach(chal => {
                    const div = document.createElement('div');
                    
                    const isClaimable = chal.progress >= chal.target && !chal.completed;
                    const isClaimed = chal.completed;
                    
                    div.className = `quest-item ${isClaimed ? 'completed-claimed' : ''}`;
                    
                    const pct = Math.min((chal.progress / chal.target) * 100, 100);
                    
                    let buttonHTML = "";
                    if (isClaimable) {
                        buttonHTML = `<button class="btn btn-primary btn-sm btn-claim-quest" data-id="${chal.id}" data-type="${chal.type}">Claim Reward</button>`;
                    } else if (isClaimed) {
                        buttonHTML = `<span class="badge-status-text text-gold"><i data-lucide="check-circle" class="icon-sm"></i> Claimed</span>`;
                    } else {
                        buttonHTML = `<button class="btn btn-secondary btn-sm" disabled>Locked</button>`;
                    }

                    div.innerHTML = `
                        <div class="quest-details">
                            <div class="quest-header-row">
                                <span class="quest-title-text">${this.escapeHTML(chal.title)}</span>
                                <span class="quest-reward-pill">+${chal.xp_reward} XP • +${chal.coins_reward} Coins</span>
                            </div>
                            <p class="quest-desc-text">${chal.description || ''}</p>
                            <div class="quest-progress-row">
                                <div class="quest-track-box">
                                    <div class="quest-bar-box-fill" style="width: ${pct}%"></div>
                                </div>
                                <span class="quest-fraction-label">${chal.progress}/${chal.target}</span>
                            </div>
                        </div>
                        <div class="quest-action-box">
                            ${buttonHTML}
                        </div>
                    `;
                    list.appendChild(div);
                });

                // Attach claim listeners
                list.querySelectorAll('.btn-claim-quest').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const chalId = btn.dataset.id;
                        const type = btn.dataset.type;
                        
                        btn.disabled = true;
                        btn.innerHTML = `<div class="spinner"></div>`;
                        
                        try {
                            // In this demo, claiming triggers Flask rewards API
                            // Let's call study_timer or simulate claim
                            let minutes = 0;
                            if (type === 'study') minutes = 60; // full claim
                            
                            const res = await fetch('/api/rewards', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({action: 'study_timer', minutes}) // progress claim
                            });
                            
                            const resData = await res.json();
                            if (resData.success) {
                                // Play Confetti
                                if (window.confetti) {
                                    window.confetti({ particleCount: 150, spread: 80 });
                                }
                                
                                this.showAchievement(
                                    "Challenge Rewards Claimed!",
                                    "Your credentials have been successfully updated",
                                    resData.xp_earned || 50,
                                    resData.coins_earned || 10
                                );
                                
                                this.loadQuestsList();
                                this.refreshGlobalProfileStats();
                                this.loadLeaderboard();
                            }
                        } catch (err) {
                            this.showToast("Connection issue claiming reward", "error");
                            btn.disabled = false;
                            btn.innerText = "Claim Reward";
                        }
                    });
                });
                
                if (window.lucide) window.lucide.createIcons();
            }
        } catch (e) {
            console.error("Failed loading quests", e);
        }
    },

    // --- STUDY ROOM CHAT SIMULATION ---
    initStudyGroupsChat: function() {
        const roomsGrid = document.querySelector('.rooms-grid');
        const chatPanel = document.getElementById('study-group-chat');
        const leaderboardCard = document.getElementById('leaderboard-card');
        const closeChatBtn = document.getElementById('close-chat-btn');
        const chatInputForm = document.getElementById('chat-input-form');
        const chatMessages = document.getElementById('chat-messages-container');

        if (!roomsGrid) return;

        // Mock chat messages databases by rooms
        const mockChats = {
            algorithms: [],
            dbms: [],
            os: []
        };

        const activeBotResponses = {
            algorithms: [],
            dbms: [],
            os: []
        };

        // Join Custom Room Click
        const btnJoinCustom = document.getElementById('btn-join-custom-room');
        if (btnJoinCustom) {
            btnJoinCustom.addEventListener('click', () => {
                const roomCodeInput = document.getElementById('input-custom-room-id');
                const roomCode = roomCodeInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
                
                if (!roomCode) {
                    this.showToast("Please enter a valid alphanumeric room code.", "error");
                    return;
                }
                
                chatPanel.dataset.activeRoom = roomCode;
                document.getElementById('chat-room-name').innerText = `Custom: ${roomCode.toUpperCase()}`;
                
                chatPanel.classList.remove('hide');
                leaderboardCard.classList.add('hide'); // collapse leaderboard
                
                if (chatPollInterval) clearInterval(chatPollInterval);
                renderedMessageIds.clear();
                
                // Clear chat bubble container and add system welcome
                chatMessages.innerHTML = "";
                appendBubble("System", `Welcome to custom room: ${roomCode.toUpperCase()}! Share this code with friends to study together.`, true);
                this.showToast(`Joined custom room: ${roomCode}`, "success");
                
                // Poll backend for new messages
                const fetchAndRenderMessages = async () => {
                    try {
                        const res = await window.StudySyncAPI.getChatMessages(roomCode);
                        if (res.success && res.messages) {
                            let hasNewPeerMessage = false;
                            res.messages.forEach(msg => {
                                if (!renderedMessageIds.has(msg.id)) {
                                    renderedMessageIds.add(msg.id);
                                    const isMe = msg.sender_id === (userProfile && (userProfile.id || userProfile.user_id) || "");
                                    appendBubble(isMe ? "You" : msg.sender, msg.text, msg.sender === "System");
                                    if (!isMe && msg.sender !== "System") {
                                        hasNewPeerMessage = true;
                                    }
                                }
                            });
                            if (hasNewPeerMessage) {
                                this.playAudioSynth('chat');
                            }
                        }
                    } catch(err) {
                        console.error("Error fetching chat messages", err);
                    }
                };
                
                fetchAndRenderMessages();
                chatPollInterval = setInterval(fetchAndRenderMessages, 2000);
            });
        }

        // Join Room Click
        document.querySelectorAll('.btn-join-room').forEach(btn => {
            btn.addEventListener('click', () => {
                const roomId = btn.dataset.roomId;
                const roomName = btn.dataset.roomName;
                
                chatPanel.dataset.activeRoom = roomId;
                document.getElementById('chat-room-name').innerText = roomName;
                
                chatPanel.classList.remove('hide');
                leaderboardCard.classList.add('hide'); // collapse leaderboard to make room
                
                // Clear active chat poll
                if (chatPollInterval) clearInterval(chatPollInterval);
                renderedMessageIds.clear();
                
                // Render initial history
                renderChatHistory(roomId);
                this.showToast(`Joined ${roomName} study space`, "success");
                
                // Poll backend for new messages
                const fetchAndRenderMessages = async () => {
                    try {
                        const res = await window.StudySyncAPI.getChatMessages(roomId);
                        if (res.success && res.messages) {
                            let hasNewPeerMessage = false;
                            res.messages.forEach(msg => {
                                if (!renderedMessageIds.has(msg.id)) {
                                    renderedMessageIds.add(msg.id);
                                    const isMe = msg.sender_id === (userProfile && (userProfile.id || userProfile.user_id) || "");
                                    appendBubble(isMe ? "You" : msg.sender, msg.text, msg.sender === "System");
                                    if (!isMe && msg.sender !== "System") {
                                        hasNewPeerMessage = true;
                                    }
                                }
                            });
                            if (hasNewPeerMessage) {
                                this.playAudioSynth('chat');
                            }
                        }
                    } catch(err) {
                        console.error("Error fetching chat messages", err);
                    }
                };
                
                fetchAndRenderMessages();
                chatPollInterval = setInterval(fetchAndRenderMessages, 2000);
            });
        });

        // Close/Leave Chat Click
        if (closeChatBtn) {
            closeChatBtn.addEventListener('click', () => {
                chatPanel.classList.add('hide');
                leaderboardCard.classList.remove('hide');
                if (chatPollInterval) clearInterval(chatPollInterval);
                renderedMessageIds.clear();
            });
        }

        const renderChatHistory = (roomId) => {
            chatMessages.innerHTML = "";
            const history = mockChats[roomId] || [];
            
            history.forEach(msg => {
                appendBubble(msg.sender, msg.text, msg.sender === "System");
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };

        const appendBubble = (sender, text, isSystem = false) => {
            const div = document.createElement('div');
            if (isSystem) {
                div.className = "empty-state";
                div.style.padding = "4px 0";
                div.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">${text}</span>`;
            } else {
                const isMe = sender === "You";
                div.className = `chat-msg ${isMe ? 'sent' : 'received'}`;
                div.innerHTML = `
                    <span class="msg-sender">${sender}</span>
                    <div class="msg-bubble">${this.escapeHTML(text)}</div>
                `;
            }
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };

        // Send Message Handler
        if (chatInputForm) {
            chatInputForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const inp = document.getElementById('chat-message-input');
                const text = inp.value.trim();
                const activeRoom = chatPanel.dataset.activeRoom;
                
                if (!text || !activeRoom) return;
                
                // Append my message
                appendBubble("You", text);
                inp.value = "";
                
                // Send to Flask backend
                window.StudySyncAPI.sendChatMessage(activeRoom, text)
                    .then(res => {
                        if (res.success && res.message) {
                            renderedMessageIds.add(res.message.id);
                        }
                    })
                    .catch(err => {
                        console.error("Error sending message", err);
                    });
            });
        }
    },

    // --- PROFILE PAGE & ACHIEVEMENT SHOP ---
    initProfilePage: function() {
        this.refreshGlobalProfileStats();
        
        // Buy Badge Event handler
        document.querySelectorAll('.btn-buy-badge').forEach(btn => {
            btn.addEventListener('click', async () => {
                const badgeId = btn.dataset.badge;
                const price = parseInt(btn.dataset.price);
                const coinsAvailable = parseInt(document.getElementById('shop-coins-balance').innerText);
                
                if (coinsAvailable < price) {
                    this.showToast(`Not enough coins! (Required: ${price}, Available: ${coinsAvailable})`, "error");
                    return;
                }

                btn.disabled = true;
                btn.innerHTML = `<div class="spinner"></div> Purchasing...`;
                
                try {
                    // Update user badges and deduct coins in database
                    const res = await fetch('/api/badges/purchase', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ badge_id: badgeId, price: price })
                    });

                    const resData = await res.json();
                    if (resData.success) {
                        // Play Confetti!
                        if (window.confetti) {
                            window.confetti({ particleCount: 150, spread: 80, origin: {y: 0.6} });
                        }

                        // Unlock badge UI
                        const badgeItem = btn.closest('.badge-item');
                        badgeItem.classList.remove('locked');
                        badgeItem.classList.add('unlocked');
                        
                        btn.classList.add('hide');
                        const statusText = badgeItem.querySelector('.badge-status-text');
                        if (statusText) {
                            statusText.classList.remove('hide');
                            statusText.innerText = "Owned";
                        }
                        
                        this.showAchievement(
                            "New Badge Unlocked!",
                            `Congratulations! You purchased the ${badgeItem.querySelector('h3').innerText} badge`,
                            0, 0
                        );
                        
                        this.refreshGlobalProfileStats();
                    } else {
                        this.showToast(resData.error || "Purchase failed", "error");
                        btn.disabled = false;
                        btn.innerHTML = `<i data-lucide="shopping-cart"></i> Buy for ${price} Coins`;
                        if (window.lucide) window.lucide.createIcons();
                    }
                } catch (err) {
                    this.showToast("Failed to finalize purchase", "error");
                    btn.disabled = false;
                    btn.innerHTML = `<i data-lucide="shopping-cart"></i> Buy for ${price} Coins`;
                    if (window.lucide) window.lucide.createIcons();
                }
            });
        });
    },

    // --- GLOBAL POPUP SYSTEM ---
    showAchievement: function(title, desc, xpReward = 0, coinsReward = 0) {
        this.playAudioSynth('fanfare');
        const popup = document.getElementById('achievement-popup');
        if (!popup) return;

        document.getElementById('achievement-title').innerText = title;
        document.getElementById('achievement-desc').innerText = desc;
        
        const xpTag = popup.querySelector('.xp-tag');
        const coinTag = popup.querySelector('.coin-tag');
        
        if (xpReward > 0) {
            xpTag.classList.remove('hide');
            xpTag.innerHTML = `<i data-lucide="sparkles"></i> +${xpReward} XP`;
        } else {
            xpTag.classList.add('hide');
        }

        if (coinsReward > 0) {
            coinTag.classList.remove('hide');
            coinTag.innerHTML = `<i data-lucide="coins"></i> +${coinsReward} Coins`;
        } else {
            coinTag.classList.add('hide');
        }

        if (window.lucide) window.lucide.createIcons();
        popup.classList.remove('hide');

        if (window.confetti) {
            window.confetti({ particleCount: 100, spread: 60, origin: { y: 0.7 } });
        }

        // Close click
        document.getElementById('achievement-close-btn').onclick = () => {
            popup.classList.add('hide');
        };
    },

    // --- GLOBAL TOAST SYSTEM ---
    showToast: function(message, type = "info") {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = "info";
        if (type === "success") icon = "check-circle";
        if (type === "error") icon = "alert-triangle";
        
        toast.innerHTML = `
            <i data-lucide="${icon}" class="toast-icon"></i>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        if (window.lucide) window.lucide.createIcons();

        // Auto remove
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(100%)";
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    },

    // --- ESCAPE HTML ---
    escapeHTML: function(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
};

// Initialize App UI
document.addEventListener('DOMContentLoaded', () => {
    window.StudySyncUI.init();
});
