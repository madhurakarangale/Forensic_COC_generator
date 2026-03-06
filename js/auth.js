// Check auth state on page load
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // User is logged in
        if (window.location.pathname.includes('index.html') || 
            window.location.pathname === '/') {
            window.location.href = 'dashboard.html';
        }
        loadUserData();
    } else {
        // User is not logged in
        if (!window.location.pathname.includes('index.html') && 
            window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
    }
});

// Tab switching
function switchTab(tab) {
    const tabs = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        tabs[0].classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        tabs[1].classList.add('active');
        document.getElementById('signupForm').classList.add('active');
    }
}

// Login form handler
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        showToast('Login successful! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// Signup form handler
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const badge = document.getElementById('signupBadge').value;
    const agency = document.getElementById('signupAgency').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    badge_number: badge,
                    agency: agency
                }
            }
        });
        
        if (error) throw error;
        
        showToast('Account created! Please check your email for confirmation.', 'success');
        
        // Clear form
        e.target.reset();
        
        // Switch to login tab after 2 seconds
        setTimeout(() => {
            switchTab('login');
        }, 2000);
        
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// Logout function
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        window.location.href = 'index.html';
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Load user data for dashboard
async function loadUserData() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            // Get profile data
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (error) throw error;
            
            // Update UI with user info
            const userNameElements = document.querySelectorAll('.user-name');
            const userBadgeElements = document.querySelectorAll('.user-badge');
            
            userNameElements.forEach(el => {
                el.textContent = profile.full_name;
            });
            
            userBadgeElements.forEach(el => {
                el.textContent = `${profile.badge_number} • ${profile.agency}`;
            });
            
            // Store user data globally
            window.currentUser = profile;
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}