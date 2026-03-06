// Toast notification
export function showToast(message, type = 'info', duration = 2000) {
    console.log('Toast:', message, type);
    const toast = document.getElementById('toast');
    if (!toast) {
        alert(message);
        return;
    }
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Format date
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    } catch (error) {
        return 'Invalid Date';
    }
}

// Format time ago
export function formatTimeAgo(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;  
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        return formatDate(dateString);
    } catch (error) {
        return 'Unknown';
    }
}

// Generate evidence ID
export function generateEvidenceId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `EVD-${timestamp}-${random}`;
}

// Validate email
export function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate password strength
export function isStrongPassword(password) {
    return password.length >= 8;
}

// Get user initials
export function getUserInitials(fullName) {
    if (!fullName) return '??';
    return fullName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Confirm action
export function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Deep clone object
export function deepClone(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (error) {
        return obj;
    }
}