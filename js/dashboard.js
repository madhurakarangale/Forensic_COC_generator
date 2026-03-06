// Import Supabase and helpers
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Supabase configuration 
const config = window.SUPABASE_CONFIG || {
    url: 'https://your-project-id.supabase.co',
    anonKey: 'your-anon-key'
};

const supabaseUrl = config.url;
const supabaseAnonKey = config.anonKey;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simple auth functions
const auth = {
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            
            if (user) {
                // Get user profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                return { 
                    success: true, 
                    user: { 
                        ...user, 
                        profile: profile || { 
                            full_name: user.user_metadata?.full_name || 'User',
                            department: user.user_metadata?.department || 'Digital Forensics'
                        } 
                    } 
                };
            }
            return { success: true, user: null };
        } catch (error) {
            console.error('Auth error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// Simple cases functions
const cases = {
    async getAllCases() {
        try {
            const { data, error } = await supabase
                .from('cases')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            return { success: false, data: [], error: error.message };
        }
    },
    
    async getRecentCases(limit = 5) {
        try {
            const { data, error } = await supabase
                .from('cases')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            return { success: false, data: [], error: error.message };
        }
    }
};

// Simple evidence functions
const evidence = {
    async getAllEvidence() {
        try {
            const { data, error } = await supabase
                .from('evidence')
                .select('*, cases(case_number, case_title)')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            return { success: false, data: [], error: error.message };
        }
    }
};

// Helper functions
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        alert(message);
        return;
    }
    
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return 'Invalid Date';
    }
}

function formatTimeAgo(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return formatDate(dateString);
    } catch {
        return 'Unknown';
    }
}

function getUserInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

// Main dashboard code
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard loaded');
    
    try {
        // Check authentication
        const userResult = await auth.getCurrentUser();
        if (!userResult.success || !userResult.user) {
            console.log('No user, redirecting to login');
            window.location.href = 'index.html';
            return;
        }
        
        console.log('User authenticated:', userResult.user.profile?.full_name);
        
        // Display user info
        displayUserInfo(userResult.user);
        
        // Load dashboard data
        await loadDashboardData();
        
        // Setup logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        // Setup search
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleSearch, 500));
        }
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showToast('Error loading dashboard', 'error');
    }
});

function displayUserInfo(user) {
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const userAvatarEl = document.getElementById('userAvatar');
    
    if (userNameEl) {
        userNameEl.textContent = user.profile?.full_name || 'User';
    }
    
    if (userRoleEl) {
        userRoleEl.textContent = user.profile?.department || 'Digital Forensics';
    }
    
    if (userAvatarEl) {
        userAvatarEl.textContent = getUserInitials(user.profile?.full_name || 'User');
    }
}

async function loadDashboardData() {
    try {
        await Promise.all([
            loadStats(),
            loadRecentCases(),
            loadActivityFeed(),
            loadEvidenceStatus()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadStats() {
    try {
        // Load cases
        const casesResult = await cases.getAllCases();
        if (casesResult.success) {
            const activeCases = casesResult.data.filter(c => 
                c.status === 'active' || c.status === 'Active'
            ).length;
            document.getElementById('activeCasesCount').textContent = activeCases;
        }
        
        // Load evidence
        const evidenceResult = await evidence.getAllEvidence();
        if (evidenceResult.success) {
            document.getElementById('totalEvidenceCount').textContent = evidenceResult.data.length;
        }
        
        // Set sample values for other stats
        document.getElementById('cocCount').textContent = '0';
        document.getElementById('pendingTransfers').textContent = '0';
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRecentCases() {
    const tbody = document.getElementById('recentCasesBody');
    if (!tbody) return;
    
    try {
        const result = await cases.getRecentCases(5);
        
        if (result.success && result.data.length > 0) {
            tbody.innerHTML = result.data.map(c => `
                <tr data-href="cases.html?id=${c.id}" style="cursor: pointer;">
                    <td><strong>${c.case_number || 'N/A'}</strong></td>
                    <td>${c.case_title || 'Untitled'}</td>
                    <td>
                        <span class="status-badge ${(c.status || 'pending').toLowerCase()}">
                            ${c.status || 'Pending'}
                        </span>
                    </td>
                    <td>${formatDate(c.created_at)}</td>
                </tr>
            `).join('');
        } else {
            // Show sample data if no real data
            tbody.innerHTML = getSampleCases();
        }
    } catch (error) {
        console.error('Error loading cases:', error);
        tbody.innerHTML = getSampleCases();
    }
}

function getSampleCases() {
    return `
    //     <tr data-href="cases.html">
    //         <td><strong>CASE-2024-001</strong></td>
    //         <td>Digital Evidence Analysis</td>
    //         <td><span class="status-badge active">Active</span></td>
    //         <td>${formatDate(new Date())}</td>
    //     </tr>
    //     <tr data-href="cases.html">
    //         <td><strong>CASE-2024-002</strong></td>
    //         <td>Mobile Device Forensics</td>
    //         <td><span class="status-badge active">Active</span></td>
    //         <td>${formatDate(new Date(Date.now() - 86400000))}</td>
    //     </tr>
    //     <tr data-href="cases.html">
    //         <td><strong>CASE-2024-003</strong></td>
    //         <td>Network Security Incident</td>
    //         <td><span class="status-badge pending">Pending</span></td>
    //         <td>${formatDate(new Date(Date.now() - 172800000))}</td>
    //     </tr>
    // `;
}

async function loadActivityFeed() {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    
    feed.innerHTML = `
        <div class="activity-item">
            <div class="activity-icon" style="background: rgba(52,152,219,0.1)">
                <i class="fas fa-microchip" style="color:#3498db"></i>
            </div>
            <div class="activity-details">
                <p>Evidence EVD-2024-001 added to Case CASE-2024-001</p>
                <span class="activity-time">2 hours ago</span>
            </div>
        </div>
        <div class="activity-item">
            <div class="activity-icon" style="background: rgba(46,204,113,0.1)">
                <i class="fas fa-exchange-alt" style="color:#27ae60"></i>
            </div>
            <div class="activity-details">
                <p>Chain of Custody updated for Evidence EVD-2024-002</p>
                <span class="activity-time">5 hours ago</span>
            </div>
        </div>
        <div class="activity-item">
            <div class="activity-icon" style="background: rgba(155,89,182,0.1)">
                <i class="fas fa-folder-open" style="color:#9b59b6"></i>
            </div>
            <div class="activity-details">
                <p>New case created: CASE-2024-003 - Mobile Device Analysis</p>
                <span class="activity-time">1 day ago</span>
            </div>
        </div>
    `;
}

async function loadEvidenceStatus() {
    const container = document.getElementById('evidenceStatus');
    if (!container) return;
    
    try {
        const result = await evidence.getAllEvidence();
        
        if (result.success && result.data.length > 0) {
            const evidenceList = result.data;
            const total = evidenceList.length || 1;
            
            const statusCounts = {
                'in-custody': evidenceList.filter(e => e.status === 'in-custody').length,
                'analyzing': evidenceList.filter(e => e.status === 'analyzing').length,
                'completed': evidenceList.filter(e => e.status === 'completed').length,
                'transferred': evidenceList.filter(e => e.status === 'transferred').length
            };
            
            container.innerHTML = `
                <div class="status-bar-item">
                    <span class="status-bar-label">In Custody</span>
                    <div class="status-bar-progress">
                        <div class="status-bar-fill in-custody" 
                             style="width: ${(statusCounts['in-custody'] / total) * 100}%"></div>
                    </div>
                    <span class="status-bar-value">${statusCounts['in-custody']}</span>
                </div>
                <div class="status-bar-item">
                    <span class="status-bar-label">Analyzing</span>
                    <div class="status-bar-progress">
                        <div class="status-bar-fill analyzing" 
                             style="width: ${(statusCounts['analyzing'] / total) * 100}%"></div>
                    </div>
                    <span class="status-bar-value">${statusCounts['analyzing']}</span>
                </div>
                <div class="status-bar-item">
                    <span class="status-bar-label">Completed</span>
                    <div class="status-bar-progress">
                        <div class="status-bar-fill completed" 
                             style="width: ${(statusCounts['completed'] / total) * 100}%"></div>
                    </div>
                    <span class="status-bar-value">${statusCounts['completed']}</span>
                </div>
                <div class="status-bar-item">
                    <span class="status-bar-label">Transferred</span>
                    <div class="status-bar-progress">
                        <div class="status-bar-fill transferred" 
                             style="width: ${(statusCounts['transferred'] / total) * 100}%"></div>
                    </div>
                    <span class="status-bar-value">${statusCounts['transferred']}</span>
                </div>
            `;
        } else {
            // Sample data
            container.innerHTML = `
                <div class="status-bar-item">
                    <span class="status-bar-label">In Custody</span>
                    <div class="status-bar-progress">
                        <div class="status-bar-fill in-custody" style="width: 45%"></div>
                    </div>
                    <span class="status-bar-value">9</span>
                </div>
                <div class="status-bar-item">
                    <span class="status-bar-label">Analyzing</span>
                    <div class="status-bar-progress">
                        <div class="status-bar-fill analyzing" style="width: 30%"></div>
                    </div>
                    <span class="status-bar-value">6</span>
                </div>
                <div class="status-bar-item">
                    <span class="status-bar-label">Completed</span>
                    <div class="status-bar-progress">
                        <div class="status-bar-fill completed" style="width: 15%"></div>
                    </div>
                    <span class="status-bar-value">3</span>
                </div>
                <div class="status-bar-item">
                    <span class="status-bar-label">Transferred</span>
                    <div class="status-bar-progress">
                        <div class="status-bar-fill transferred" style="width: 10%"></div>
                    </div>
                    <span class="status-bar-value">2</span>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading evidence status:', error);
        container.innerHTML = '<p class="text-center">Error loading status</p>';
    }
}

async function handleLogout() {
    try {
        const result = await auth.signOut();
        if (result.success) {
            showToast('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    } catch (error) {
        showToast('Error logging out', 'error');
    }
}

function handleSearch(e) {
    const term = e.target.value;
    if (term.length > 2) {
        console.log('Searching for:', term);
    }
}

function debounce(func, wait) {
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