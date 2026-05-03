/**
 * ==========================================
 * USER-INFO.JS — Profile Completion Page
 * Reads session from localStorage (set by Google Sign-In on index.html)
 * Saves user info directly to Supabase database
 * ==========================================
 */

// ─── Supabase Setup ───
const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';
let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.error('Supabase initialization failed:', e);
    }
} else {
    console.warn('Supabase credentials missing. Database functionality will be disabled.');
}

// ─── DOM References ───
const loadingOverlay = document.getElementById('loading-overlay');
const emailChip = document.getElementById('email-chip');
const emailDisplay = document.getElementById('email-display');
const form = document.getElementById('user-info-form');
const submitBtn = document.getElementById('submit-btn');

// Holds the verified email from the Google login session
let currentUserEmail = null;

// ─── Auth Check (On Load) ───
(function checkAuth() {
    const sessionData = localStorage.getItem('sessionUser');

    if (!sessionData) {
        console.log('No session found, redirecting to login...');
        window.location.href = 'index.html';
        return;
    }

    try {
        const user = JSON.parse(sessionData);
        currentUserEmail = user.email;
        console.log('Logged in as:', currentUserEmail);

        // Show the email chip
        emailDisplay.textContent = currentUserEmail;
        emailChip.style.visibility = 'visible';

    } catch (err) {
        console.error('Failed to parse session:', err);
        window.location.href = 'index.html';
        return;
    }

    // Fade out loading overlay
    loadingOverlay.classList.add('hidden');
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
    }, 400);
})();

// ─── Form Submission Logic ───
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('full-name').value.trim();
    const age = parseInt(document.getElementById('age').value, 10);

    // Basic client-side validation
    if (!name) {
        alert('Please enter your full name.');
        return;
    }
    if (!age || age < 1 || age > 120) {
        alert('Please enter a valid age (1–120).');
        return;
    }
    if (!currentUserEmail) {
        alert('Session expired. Please log in again.');
        window.location.href = 'index.html';
        return;
    }

    // Show loading state on button
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
        // ─── Save to Supabase Database ───
        // Only try to insert if we have a URL and Key
        if (SUPABASE_URL && SUPABASE_ANON_KEY) {
            const { data, error } = await supabaseClient
                .from('users')
                .insert([
                    {
                        name: name,
                        age: age,
                        email: currentUserEmail
                    }
                ]);

            if (error) {
                console.error('Supabase insert error:', error);
                alert('Failed to save your info to database: ' + error.message);
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
                return;
            }
            console.log('User info saved to Supabase successfully!', data);
        } else {
            console.warn('Supabase not configured, skipping database insert and using localStorage fallback.');
        }

        // Also save locally as backup
        localStorage.setItem('userInfo', JSON.stringify({ name, age, email: currentUserEmail }));

        // Also try sending to teammate's backend (non-blocking)
        try {
            fetch('http://192.168.236.25:3000/api/user-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, age, email: currentUserEmail }),
            });
        } catch (backendErr) {
            console.warn('Teammate backend unreachable:', backendErr.message);
        }

        // Mark profile as completed and go to main
        localStorage.setItem('userInfoCompleted', 'true');
        window.location.href = 'main.html';

    } catch (err) {
        console.error('Unexpected error:', err);
        alert('Something went wrong. Please try again.');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});
