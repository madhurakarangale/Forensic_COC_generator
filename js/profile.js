import { auth, supabase } from './utils/supabase.js'
import { showToast, formatDate, getUserInitials } from './utils/helpers.js'

// State management
let currentUser = null
let userProfile = null
let userStats = {
    cases: 0,
    evidence: 0,
    coc: 0
}

// DOM Elements
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const userResult = await auth.getCurrentUser()
    if (!userResult.success || !userResult.user) {
        window.location.href = 'index.html'
        return
    }
    currentUser = userResult.user
    userProfile = userResult.user.profile
    
    // Display user info
    displayUserInfo()
    
    // Load user data
    await loadUserStats()
    await loadUserActivity()
    
    // Setup event listeners
    setupEventListeners()
    
    // Setup logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout)
})

// Display user information
function displayUserInfo() {
    // Sidebar
    document.getElementById('userName').textContent = userProfile.full_name
    document.getElementById('userRole').textContent = userProfile.department
    
    const avatarEl = document.getElementById('userAvatar')
    avatarEl.textContent = getUserInitials(userProfile.full_name)
    
    // Profile section
    document.getElementById('profileFullName').textContent = userProfile.full_name
    document.getElementById('profileDepartment').textContent = userProfile.department
    document.getElementById('profileBadge').textContent = `Badge: ${userProfile.badge_number}`
    document.getElementById('profileAvatar').innerHTML = 
        `<span id="avatarInitials">${getUserInitials(userProfile.full_name)}</span>`
    
    // Format join date
    const joinDate = new Date(currentUser.user.created_at)
    document.getElementById('memberSince').textContent = 
        `Member since ${joinDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    
    // Populate form fields
    document.getElementById('editFullName').value = userProfile.full_name
    document.getElementById('editEmail').value = currentUser.user.email
    document.getElementById('editBadge').value = userProfile.badge_number
    document.getElementById('editDepartment').value = userProfile.department
    document.getElementById('editPhone').value = userProfile.phone || ''
    document.getElementById('editOffice').value = userProfile.office_location || ''
}

// Load user statistics
async function loadUserStats() {
    try {
        // Get cases created by user
        const { data: cases, error: casesError } = await supabase
            .from('cases')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', currentUser.user.id)
        
        if (!casesError) {
            userStats.cases = cases.length
        }
        
        // Get evidence handled by user
        const { data: evidence, error: evidenceError } = await supabase
            .from('evidence')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', currentUser.user.id)
        
        if (!evidenceError) {
            userStats.evidence = evidence.length
        }
        
        // Get COC entries by user
        const { data: coc, error: cocError } = await supabase
            .from('chain_of_custody')
            .select('id', { count: 'exact', head: true })
            .eq('transferred_by', currentUser.user.id)
        
        if (!cocError) {
            userStats.coc = coc.length
        }
        
        // Update display
        document.getElementById('casesHandled').textContent = userStats.cases
        document.getElementById('evidenceHandled').textContent = userStats.evidence
        document.getElementById('cocHandled').textContent = userStats.coc
        
    } catch (error) {
        console.error('Error loading user stats:', error)
    }
}

// Load user activity
async function loadUserActivity() {
    try {
        const activities = []
        
        // Get recent cases
        const { data: recentCases } = await supabase
            .from('cases')
            .select('*')
            .eq('created_by', currentUser.user.id)
            .order('created_at', { ascending: false })
            .limit(5)
        
        if (recentCases) {
            recentCases.forEach(c => {
                activities.push({
                    type: 'case',
                    title: 'Case Created',
                    description: `Case ${c.case_number}: ${c.case_title}`,
                    time: c.created_at,
                    icon: 'folder'
                })
            })
        }
        
        // Get recent evidence
        const { data: recentEvidence } = await supabase
            .from('evidence')
            .select('*')
            .eq('created_by', currentUser.user.id)
            .order('created_at', { ascending: false })
            .limit(5)
        
        if (recentEvidence) {
            recentEvidence.forEach(e => {
                activities.push({
                    type: 'evidence',
                    title: 'Evidence Added',
                    description: `${e.evidence_id}: ${e.description.substring(0, 50)}...`,
                    time: e.created_at,
                    icon: 'microchip'
                })
            })
        }
        
        // Get recent COC transfers
        const { data: recentCOC } = await supabase
            .from('chain_of_custody')
            .select('*, evidence!inner(evidence_id)')
            .eq('transferred_by', currentUser.user.id)
            .order('transfer_date', { ascending: false })
            .limit(5)
        
        if (recentCOC) {
            recentCOC.forEach(c => {
                activities.push({
                    type: 'coc',
                    title: 'COC Transfer',
                    description: `Evidence ${c.evidence.evidence_id} transferred`,
                    time: c.transfer_date,
                    icon: 'exchange-alt'
                })
            })
        }
        
        // Sort by time descending
        activities.sort((a, b) => new Date(b.time) - new Date(a.time))
        
        // Display activities
        displayActivities(activities.slice(0, 10))
        
    } catch (error) {
        console.error('Error loading activities:', error)
    }
}

// Display activities
function displayActivities(activities) {
    const timeline = document.getElementById('userActivityTimeline')
    
    if (activities.length === 0) {
        timeline.innerHTML = '<p class="no-data">No recent activity</p>'
        return
    }
    
    timeline.innerHTML = activities.map(activity => `
        <div class="timeline-item">
            <div class="timeline-dot" style="background: ${getActivityColor(activity.type)}"></div>
            <div class="content">
                <div class="header">
                    <span class="title">
                        <i class="fas fa-${activity.icon}"></i>
                        ${activity.title}
                    </span>
                    <span class="time">${formatTimeAgo(activity.time)}</span>
                </div>
                <div class="description">${activity.description}</div>
            </div>
        </div>
    `).join('')
}

// Get activity color
function getActivityColor(type) {
    const colors = {
        case: '#3498db',
        evidence: '#27ae60',
        coc: '#f39c12'
    }
    return colors[type] || '#95a5a6'
}

// Format time ago
function formatTimeAgo(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    
    if (seconds < 60) return 'just now'
    
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
    
    return formatDate(dateString)
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.profile-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.profile-tabs .tab-btn').forEach(b => b.classList.remove('active'))
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'))
            
            e.target.closest('.tab-btn').classList.add('active')
            document.getElementById(`${e.target.closest('.tab-btn').dataset.tab}-tab`).classList.add('active')
        })
    })
    
    // Personal info form
    document.getElementById('personalInfoForm').addEventListener('submit', handlePersonalInfoUpdate)
    
    // Password change form
    document.getElementById('changePasswordForm').addEventListener('submit', handlePasswordChange)
    
    // Two-factor toggle
    document.getElementById('twoFactorToggle').addEventListener('change', handleTwoFactorToggle)
    
    // SMS toggle
    document.getElementById('smsToggle').addEventListener('change', handleSMSToggle)
    
    // Preferences
    document.getElementById('themeSelect').addEventListener('change', handleThemeChange)
    document.getElementById('itemsPerPage').addEventListener('change', handleItemsPerPageChange)
    document.getElementById('defaultView').addEventListener('change', handleDefaultViewChange)
    
    // Email notifications
    document.getElementById('emailNotifications').addEventListener('change', handleNotificationChange)
    document.getElementById('cocAlerts').addEventListener('change', handleNotificationChange)
    document.getElementById('dailyDigest').addEventListener('change', handleNotificationChange)
    
    // Load saved preferences
    loadUserPreferences()
}

// Handle personal info update
async function handlePersonalInfoUpdate(e) {
    e.preventDefault()
    
    const updates = {
        full_name: document.getElementById('editFullName').value,
        department: document.getElementById('editDepartment').value,
        phone: document.getElementById('editPhone').value,
        office_location: document.getElementById('editOffice').value
    }
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', currentUser.user.id)
        
        if (error) throw error
        
        showToast('Profile updated successfully', 'success')
        
        // Update displayed info
        userProfile = { ...userProfile, ...updates }
        displayUserInfo()
        
    } catch (error) {
        showToast(error.message, 'error')
    }
}

// Handle password change
async function handlePasswordChange(e) {
    e.preventDefault()
    
    const currentPassword = document.getElementById('currentPassword').value
    const newPassword = document.getElementById('newPassword').value
    const confirmPassword = document.getElementById('confirmPassword').value
    
    // Validate
    if (newPassword.length < 8) {
        showToast('Password must be at least 8 characters', 'error')
        return
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error')
        return
    }
    
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        })
        
        if (error) throw error
        
        showToast('Password updated successfully', 'success')
        document.getElementById('changePasswordForm').reset()
        
    } catch (error) {
        showToast(error.message, 'error')
    }
}

// Handle two-factor toggle
async function handleTwoFactorToggle(e) {
    const enabled = e.target.checked
    
    if (enabled) {
        // Show 2FA setup modal
        showTwoFactorSetup()
    } else {
        // Disable 2FA
        try {
            const { error } = await supabase.auth.updateUser({
                app_metadata: { two_factor_enabled: false }
            })
            
            if (error) throw error
            showToast('Two-factor authentication disabled', 'success')
            
        } catch (error) {
            showToast(error.message, 'error')
            e.target.checked = true
        }
    }
}

// Show 2FA setup
function showTwoFactorSetup() {
    // Implementation for 2FA setup modal
    showToast('2FA setup coming soon', 'info')
}

// Handle SMS toggle
async function handleSMSToggle(e) {
    const enabled = e.target.checked
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ sms_auth_enabled: enabled })
            .eq('id', currentUser.user.id)
        
        if (error) throw error
        
        showToast(`SMS authentication ${enabled ? 'enabled' : 'disabled'}`, 'success')
        
    } catch (error) {
        showToast(error.message, 'error')
        e.target.checked = !enabled
    }
}

// Load user preferences
async function loadUserPreferences() {
    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', currentUser.user.id)
            .single()
        
        if (error && error.code !== 'PGRST116') throw error
        
        if (data) {
            document.getElementById('themeSelect').value = data.theme || 'light'
            document.getElementById('itemsPerPage').value = data.items_per_page || '10'
            document.getElementById('defaultView').value = data.default_view || 'dashboard'
            
            document.getElementById('emailNotifications').checked = data.email_notifications !== false
            document.getElementById('cocAlerts').checked = data.coc_alerts !== false
            document.getElementById('dailyDigest').checked = data.daily_digest === true
        }
        
    } catch (error) {
        console.error('Error loading preferences:', error)
    }
}

// Handle theme change
async function handleThemeChange(e) {
    const theme = e.target.value
    document.body.className = theme === 'dark' ? 'dark-theme' : ''
    
    await savePreference('theme', theme)
}

// Handle items per page change
async function handleItemsPerPageChange(e) {
    await savePreference('items_per_page', e.target.value)
    showToast('Preference saved', 'success')
}

// Handle default view change
async function handleDefaultViewChange(e) {
    await savePreference('default_view', e.target.value)
    showToast('Preference saved', 'success')
}

// Handle notification changes
async function handleNotificationChange(e) {
    const prefName = e.target.id
    const prefValue = e.target.checked
    
    const prefMap = {
        'emailNotifications': 'email_notifications',
        'cocAlerts': 'coc_alerts',
        'dailyDigest': 'daily_digest'
    }
    
    await savePreference(prefMap[prefName], prefValue)
}

// Save preference
async function savePreference(key, value) {
    try {
        const { error } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: currentUser.user.id,
                [key]: value,
                updated_at: new Date().toISOString()
            })
        
        if (error) throw error
        
    } catch (error) {
        console.error('Error saving preference:', error)
    }
}

// Handle logout
async function handleLogout() {
    const result = await auth.signOut()
    if (result.success) {
        window.location.href = 'index.html'
    } else {
        showToast('Error logging out', 'error')
    }
}