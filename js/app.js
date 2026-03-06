import { auth } from './utils/supabase.js';
import { showToast, isValidEmail, isStrongPassword } from './utils/helpers.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ App.js loaded - DOM ready'); 
    checkAuthState();   // Check if user is already logged in    
    setupTabs();   // Setup tab switching
    setupForms();  // Setup form submissions
});

// Check if user is already authenticated
async function checkAuthState() {
    try {
        const result = await auth.getCurrentUser();
        if (result.success && result.user) {
            console.log('User already logged in, redirecting to dashboard');
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

// Setup tab switching functionality
function setupTabs() {
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    console.log('Elements found:', {
        loginTab: !!loginTab,
        signupTab: !!signupTab,
        loginForm: !!loginForm,
        signupForm: !!signupForm
    });
    
    if (!loginTab || !signupTab || !loginForm || !signupForm) {
        console.error('❌ Tab elements not found - check HTML IDs');
        return;
    }
    
    // Function to switch tabs
    function switchTab(tab) {
        console.log('Switching to tab:', tab);
        
        // Remove active class from all tabs and forms
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        
        // Add active class to selected tab and form
        if (tab === 'login') {
            loginTab.classList.add('active');
            loginForm.classList.add('active');
        } else {
            signupTab.classList.add('active');
            signupForm.classList.add('active');
        }
    }
    
    // Add click event listeners
    loginTab.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('login');
    });
    
    signupTab.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('signup');
    });
}

// Setup form submissions
function setupForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    console.log('Login attempt for:', email);
    
    // Validation
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    submitBtn.disabled = true;
    
    try {
        // Attempt login
        const result = await auth.signIn(email, password);
        
        if (result.success) {
            showToast('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showToast(result.error || 'Login failed. Please check your credentials.', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('An error occurred during login', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Handle signup form submission
async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const badgeNumber = document.getElementById('badgeNumber').value.trim();
    const department = document.getElementById('department').value;
    
    console.log('Signup attempt for:', email);
    
    // Validation
    if (!name || !email || !password || !badgeNumber || !department) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email', 'error');
        return;
    }
    
    if (!isStrongPassword(password)) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    submitBtn.disabled = true;
    
    try {
        // Attempt signup
        const result = await auth.signUp(email, password, {
            full_name: name,
            badge_number: badgeNumber,
            department: department
        });
        
        if (result.success) {
            showToast('Account created successfully!', 'success');
            
            // Clear form
            document.getElementById('signupForm').reset();
            
            // Switch to login tab after 2 seconds
            setTimeout(() => {
                const loginTab = document.getElementById('loginTab');
                if (loginTab) {
                    loginTab.click();
                    document.getElementById('loginEmail').value = email;
                }
            }, 2000);
        } else {
            showToast(result.error || 'Signup failed. Please try again.', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Signup error:', error);
        showToast('An error occurred during signup', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Make functions available globally for debugging
window.app = {
    handleLogin,
    handleSignup
};