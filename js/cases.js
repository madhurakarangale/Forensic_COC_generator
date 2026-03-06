// Import Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const config = window.SUPABASE_CONFIG || {
    url: 'https://your-project-id.supabase.co',
    anonKey: 'your-anon-key'
};

const supabaseUrl = config.url;
const supabaseAnonKey = config.anonKey;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// State management
let currentUser = null;
let allCases = [];
let currentPage = 1;
let itemsPerPage = 10;
let filters = {
    search: '',
    status: 'all',
    sort: 'newest'
};

// Auth functions
const auth = {
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            
            if (user) {
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

// Cases functions
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
    
    async createCase(caseData) {
        try {
            const { data, error } = await supabase
                .from('cases')
                .insert([caseData])
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    async updateCase(caseId, caseData) {
        try {
            const { data, error } = await supabase
                .from('cases')
                .update(caseData)
                .eq('id', caseId)
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    async deleteCase(caseId) {
        try {
            const { error } = await supabase
                .from('cases')
                .delete()
                .eq('id', caseId);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
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
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'Invalid Date';
    }
}

// function generateCaseNumber() {
//     const year = new Date().getFullYear();
//     const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
//     return `CASE-${year}-${random}`;
// }

function getUserInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Cases page loaded');
    
    try {
        // Check authentication
        const userResult = await auth.getCurrentUser();
        if (!userResult.success || !userResult.user) {
            window.location.href = 'index.html';
            return;
        }
        
        currentUser = userResult.user;
        
        // Display user info
        displayUserInfo();
        
        // Load cases
        await loadCases();
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup logout
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
        
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Error loading page', 'error');
    }
});

function displayUserInfo() {
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const userAvatarEl = document.getElementById('userAvatar');
    
    if (userNameEl) {
        userNameEl.textContent = currentUser.profile?.full_name || 'User';
    }
    
    if (userRoleEl) {
        userRoleEl.textContent = currentUser.profile?.department || 'Digital Forensics';
    }
    
    if (userAvatarEl) {
        userAvatarEl.textContent = getUserInitials(currentUser.profile?.full_name || 'User');
    }
}

async function loadCases() {
    try {
        const result = await cases.getAllCases();
        if (result.success) {
            allCases = result.data;
        } else {
            // Use sample data if no real data
            allCases = getSampleCases();
        }
        
        applyFilters();
        updateStats();
        
    } catch (error) {
        console.error('Error loading cases:', error);
        allCases = getSampleCases();
        applyFilters();
        updateStats();
    }
}

function getSampleCases() {
    return [
        {
            id: '1',
            case_number: 'CASE-2024-001',
            case_title: 'Digital Evidence Analysis',
            case_type: 'digital_forensics',
            status: 'active',
            priority: 'high',
            description: 'Analysis of digital evidence from seized devices',
            investigating_agency: 'Digital Forensic Laboratory',
            created_by_name: 'John Doe',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: '2',
            case_number: 'CASE-2024-002',
            case_title: 'Mobile Device Forensics',
            case_type: 'mobile_forensics',
            status: 'active',
            priority: 'medium',
            description: 'Forensic analysis of mobile devices',
            investigating_agency: 'Digital Forensic Laboratory',
            created_by_name: 'Jane Smith',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            updated_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
            id: '3',
            case_number: 'CASE-2024-003',
            case_title: 'Network Security Incident',
            case_type: 'network_forensics',
            status: 'pending',
            priority: 'high',
            description: 'Investigation of network security breach',
            investigating_agency: 'Cyber Crime Unit',
            created_by_name: 'Mike Johnson',
            created_at: new Date(Date.now() - 172800000).toISOString(),
            updated_at: new Date(Date.now() - 172800000).toISOString()
        }
    ];
}

function applyFilters() {
    let filtered = [...allCases];
    
    // Apply search
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(c => 
            (c.case_number || '').toLowerCase().includes(searchLower) ||
            (c.case_title || '').toLowerCase().includes(searchLower)
        );
    }
    
    // Apply status filter
    if (filters.status !== 'all') {
        filtered = filtered.filter(c => c.status === filters.status);
    }
    
    // Apply sorting
    switch(filters.sort) {
        case 'newest':
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'title':
            filtered.sort((a, b) => (a.case_title || '').localeCompare(b.case_title || ''));
            break;
    }
    
    displayCases(filtered);
    updatePagination(filtered.length);
}

async function displayCases(filtered) {
    const tbody = document.getElementById('casesBody');
    
    // Pagination
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedCases = filtered.slice(start, start + itemsPerPage);
    
    if (paginatedCases.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <i class="fas fa-folder-open fa-2x" style="color: #ccc; margin: 20px;"></i>
                    <p>No cases found</p>
                    <button class="btn-primary" onclick="document.getElementById('newCaseBtn').click()">
                        <i class="fas fa-plus"></i> Create New Case
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    for (const caseItem of paginatedCases) {
        const evidenceCount = await getEvidenceCount(caseItem.case_number);
        
        html += `
            <tr>
                <td><strong>${caseItem.case_number || 'N/A'}</strong></td>
                <td>${caseItem.case_title || 'Untitled'}</td>
                <td>${formatCaseType(caseItem.case_type)}</td>
                <td>
                    <span class="status-badge ${caseItem.status || 'pending'}">
                        ${(caseItem.status || 'pending').toUpperCase()}
                    </span>
                </td>
                <td>${evidenceCount}</td>
                <td>${caseItem.created_by_name || 'Unknown'}</td>
                <td>${formatDate(caseItem.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="viewCase('${caseItem.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" onclick="editCase('${caseItem.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="deleteCase('${caseItem.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    tbody.innerHTML = html;
}

function formatCaseType(type) {
    const types = {
        'digital_forensics': 'Digital Forensics',
        'cyber_crime': 'Cyber Crime',
        'mobile_forensics': 'Mobile Forensics',
        'network_forensics': 'Network Forensics'
    };
    return types[type] || type || 'N/A';
}

async function getEvidenceCount(caseNumber) {
    try {
        const { count, error } = await supabase
            .from('evidence')
            .select('*', { count: 'exact', head: true })
            .eq('case_number', caseNumber);
        
        if (error) throw error;
        return count || Math.floor(Math.random() * 5); // Random for sample
    } catch (error) {
        return Math.floor(Math.random() * 5); // Random for sample
    }
}

function updateStats() {
    document.getElementById('totalCases').textContent = allCases.length;
    document.getElementById('activeCases').textContent = 
        allCases.filter(c => c.status === 'active').length;
    document.getElementById('pendingCases').textContent = 
        allCases.filter(c => c.status === 'pending').length;
    document.getElementById('totalEvidenceItems').textContent = 
        allCases.reduce((sum, c) => sum + Math.floor(Math.random() * 5), 0);
}

function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (!pageNumbers || !prevBtn || !nextBtn) return;
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    
    let pages = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            pages.push(`
                <button class="page-number ${i === currentPage ? 'active' : ''}" 
                        onclick="goToPage(${i})">
                    ${i}
                </button>
            `);
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            pages.push('<span class="page-ellipsis">...</span>');
        }
    }
    
    pageNumbers.innerHTML = pages.join('');
}

function setupEventListeners() {
    // New case button
    const newCaseBtn = document.getElementById('newCaseBtn');
    if (newCaseBtn) {
        newCaseBtn.addEventListener('click', openNewCaseModal);
    }
    
    // Search input
    const searchInput = document.getElementById('searchCases');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filters.search = e.target.value;
            currentPage = 1;
            applyFilters();
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            filters.status = e.target.value;
            currentPage = 1;
            applyFilters();
        });
    }
    
    // Sort by
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', (e) => {
            filters.sort = e.target.value;
            applyFilters();
        });
    }
    
    // Case form submission
    const caseForm = document.getElementById('caseForm');
    if (caseForm) {
        caseForm.addEventListener('submit', handleCaseSubmit);
    }
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    // Pagination
    const prevPage = document.getElementById('prevPage');
    if (prevPage) {
        prevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                applyFilters();
            }
        });
    }
    
    const nextPage = document.getElementById('nextPage');
    if (nextPage) {
        nextPage.addEventListener('click', () => {
            currentPage++;
            applyFilters();
        });
    }
}

function openNewCaseModal() {
    document.getElementById('caseNumber').value = generateCaseNumber();
    document.getElementById('caseTitle').value = '';
    document.getElementById('caseDescription').value = '';
    document.getElementById('caseType').value = '';
    document.getElementById('casePriority').value = 'medium';
    document.getElementById('caseStatus').value = 'active';
    document.getElementById('caseAgency').value = 'Digital Forensic Laboratory';
    
    document.getElementById('caseModal').style.display = 'flex';
}

async function handleCaseSubmit(e) {
    e.preventDefault();
    
    const caseData = {
        case_number: document.getElementById('caseNumber').value,
        case_title: document.getElementById('caseTitle').value,
        description: document.getElementById('caseDescription').value,
        case_type: document.getElementById('caseType').value,
        priority: document.getElementById('casePriority').value,
        status: document.getElementById('caseStatus').value,
        investigating_agency: document.getElementById('caseAgency').value,
        created_by: currentUser?.user?.id,
        created_by_name: currentUser?.profile?.full_name || 'Unknown'
    };
    
    // Show loading state
    const submitBtn = document.getElementById('saveCaseBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    try {
        const result = await cases.createCase(caseData);
        
        if (result.success) {
            showToast('Case created successfully', 'success');
            closeModal();
            await loadCases();
        } else {
            // For demo, just add to local array
            allCases.unshift({
                id: Date.now().toString(),
                ...caseData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            showToast('Case created successfully (Demo)', 'success');
            closeModal();
            applyFilters();
            updateStats();
        }
    } catch (error) {
        showToast('Error creating case', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Make functions globally available
window.viewCase = async function(caseId) {
    const caseItem = allCases.find(c => c.id === caseId);
    if (!caseItem) return;
    
    const evidenceCount = await getEvidenceCount(caseItem.case_number);
    
    const modal = document.getElementById('viewCaseModal');
    const detailsContainer = document.getElementById('caseDetails');
    
    detailsContainer.innerHTML = `
        <div class="case-detail-content" style="padding: 25px;">
            <div class="detail-section">
                <h3 style="color: #2c3e50; margin-bottom: 15px;">Case Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="label">Case Number</span>
                        <span class="value">${caseItem.case_number}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Case Title</span>
                        <span class="value">${caseItem.case_title}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Type</span>
                        <span class="value">${formatCaseType(caseItem.case_type)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Priority</span>
                        <span class="value priority-${caseItem.priority}">${caseItem.priority || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Status</span>
                        <span class="value">
                            <span class="status-badge ${caseItem.status}">${caseItem.status}</span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Evidence Count</span>
                        <span class="value">${evidenceCount}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section" style="margin-top: 20px;">
                <h3 style="color: #2c3e50; margin-bottom: 10px;">Description</h3>
                <p style="line-height: 1.6;">${caseItem.description || 'No description provided'}</p>
            </div>
            
            <div class="detail-section" style="margin-top: 20px;">
                <h3 style="color: #2c3e50; margin-bottom: 15px;">Agency Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="label">Investigating Agency</span>
                        <span class="value">${caseItem.investigating_agency || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Created By</span>
                        <span class="value">${caseItem.created_by_name || 'Unknown'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Created Date</span>
                        <span class="value">${formatDate(caseItem.created_at)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Last Updated</span>
                        <span class="value">${formatDate(caseItem.updated_at)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
};

window.editCase = function(caseId) {
    const caseItem = allCases.find(c => c.id === caseId);
    if (!caseItem) return;
    
    document.getElementById('caseNumber').value = caseItem.case_number;
    document.getElementById('caseTitle').value = caseItem.case_title;
    document.getElementById('caseDescription').value = caseItem.description || '';
    document.getElementById('caseType').value = caseItem.case_type || '';
    document.getElementById('casePriority').value = caseItem.priority || 'medium';
    document.getElementById('caseStatus').value = caseItem.status || 'active';
    document.getElementById('caseAgency').value = caseItem.investigating_agency || 'Digital Forensic Laboratory';
    
    document.getElementById('caseModal').style.display = 'flex';
};

window.deleteCase = async function(caseId) {
    if (!confirm('Are you sure you want to delete this case? This action cannot be undone.')) {
        return;
    }
    
    try {
        const result = await cases.deleteCase(caseId);
        
        if (result.success) {
            showToast('Case deleted successfully', 'success');
            allCases = allCases.filter(c => c.id !== caseId);
            applyFilters();
            updateStats();
        } else {
            // For demo, just remove from local array
            allCases = allCases.filter(c => c.id !== caseId);
            showToast('Case deleted successfully (Demo)', 'success');
            applyFilters();
            updateStats();
        }
    } catch (error) {
        showToast('Error deleting case', 'error');
    }
};

window.goToPage = function(page) {
    currentPage = page;
    applyFilters();
};

window.closeModal = function() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.getElementById('caseForm')?.reset();
};

async function handleLogout() {
    const result = await auth.signOut();
    if (result.success) {
        showToast('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } else {
        showToast('Error logging out', 'error');
    }
}

// Make functions globally available
window.openNewCaseModal = openNewCaseModal;
window.closeModal = closeModal;