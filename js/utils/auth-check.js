import { auth } from './supabase.js';
import { showToast } from './helpers.js';

export async function checkAuth() {
    try {
        const userResult = await auth.getCurrentUser();
        if (!userResult.success || !userResult.user) {
            window.location.href = 'index.html';
            return null;
        }
        return userResult.user;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'index.html';
        return null;
    }
}

export async function handleLogout() {
    try {
        const result = await auth.signOut();
        if (result.success) {
            showToast('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showToast('Error logging out', 'error');
        }
    } catch (error) {
        showToast('Error logging out', 'error');
    }
}

export function displayUserInfo(user) {
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const userAvatarEl = document.getElementById('userAvatar');
    
    if (!user || !user.profile) return;
    
    if (userNameEl) {
        userNameEl.textContent = user.profile.full_name || 'User';
    }
    
    if (userRoleEl) {
        userRoleEl.textContent = user.profile.department || 'Digital Forensics';
    }
    
    if (userAvatarEl) {
        const initials = (user.profile.full_name || 'User')
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        userAvatarEl.textContent = initials;
    }
}