/* ==========================================================================
   STUDYSYNC AI - CENTRALIZED API CLIENT SERVICE
   ========================================================================== */

window.StudySyncAPI = {
    // --- TASKS CORE API ---
    getTasks: async function() {
        const res = await fetch('/api/tasks');
        return await res.json();
    },

    createTask: async function(title, priority, category, dueDate) {
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, priority, category, due_date: dueDate })
        });
        return await res.json();
    },

    updateTask: async function(id, completed) {
        const res = await fetch('/api/tasks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, completed })
        });
        return await res.json();
    },

    deleteTask: async function(id) {
        const res = await fetch(`/api/tasks?id=${id}`, {
            method: 'DELETE'
        });
        return await res.json();
    },

    // --- AI INTEGRATION API ---
    generateSummary: async function(payload) {
        const isFormData = payload instanceof FormData;
        const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
        const body = isFormData ? payload : JSON.stringify(payload);
        
        const res = await fetch('/api/summary', {
            method: 'POST',
            headers: headers,
            body: body
        });
        return await res.json();
    },

    generateQuiz: async function(payload) {
        const isFormData = payload instanceof FormData;
        const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
        const body = isFormData ? payload : JSON.stringify(payload);
        
        const res = await fetch('/api/quiz', {
            method: 'POST',
            headers: headers,
            body: body
        });
        return await res.json();
    },

    // --- GAMIFICATION & QUESTS API ---
    getChallenges: async function() {
        const res = await fetch('/api/challenges');
        return await res.json();
    },

    claimQuizRewards: async function(score) {
        const res = await fetch('/api/rewards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'quiz_complete', score })
        });
        return await res.json();
    },

    claimStudyTimerRewards: async function(minutes) {
        const res = await fetch('/api/rewards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'study_timer', minutes })
        });
        return await res.json();
    },

    // --- PROFILE FETCH ---
    getProfile: async function() {
        const res = await fetch('/api/profile');
        return await res.json();
    },

    getAnalyticsHistory: async function() {
        const res = await fetch('/api/analytics/history');
        return await res.json();
    }
};
