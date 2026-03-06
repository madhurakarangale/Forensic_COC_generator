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

// State management
let currentUser = null;
let allEvidence = [];
let allCases = [];
let currentPage = 1;
let itemsPerPage = 12;
let currentView = 'grid';
let filters = {
    search: '',
    case: 'all',
    status: 'all',
    type: 'all'
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
            console.error('Error loading cases:', error);
            return { success: false, data: [], error: error.message };
        }
    }
};

// Evidence functions
const evidence = {
    async getAllEvidence() {
        try {
            const { data, error } = await supabase
                .from('evidence')
                .select(`
                    *,
                    cases (
                        case_number,
                        case_title
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error loading evidence:', error);
            return { success: false, data: [], error: error.message };
        }
    },
    
    async createEvidence(evidenceData) {
        try {
            const { data, error } = await supabase
                .from('evidence')
                .insert([evidenceData])
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error creating evidence:', error);
            return { success: false, error: error.message };
        }
    },
    
    async updateEvidence(evidenceId, evidenceData) {
        try {
            const { data, error } = await supabase
                .from('evidence')
                .update(evidenceData)
                .eq('id', evidenceId)
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error updating evidence:', error);
            return { success: false, error: error.message };
        }
    },
    
    async deleteEvidence(evidenceId) {
        try {
            const { error } = await supabase
                .from('evidence')
                .delete()
                .eq('id', evidenceId);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting evidence:', error);
            return { success: false, error: error.message };
        }
    }
};

// Chain of Custody functions
const chainOfCustody = {
    async getEvidenceCOC(evidenceId) {
        try {
            const { data, error } = await supabase
                .from('chain_of_custody')
                .select(`
                    *,
                    profiles:transferred_by (
                        full_name
                    )
                `)
                .eq('evidence_id', evidenceId)
                .order('transfer_date', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error loading COC:', error);
            return { success: false, data: [], error: error.message };
        }
    },
    
    async createCOCEntry(cocData) {
        try {
            const { data, error } = await supabase
                .from('chain_of_custody')
                .insert([cocData])
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error creating COC:', error);
            return { success: false, error: error.message };
        }
    }
};

// Real-time subscriptions
const realtime = {
    subscribeToEvidence(callback) {
        return supabase
            .channel('evidence-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'evidence' },
                payload => callback(payload)
            )
            .subscribe();
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

function generateEvidenceId() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetters = Array(3).fill(0).map(() => letters[Math.floor(Math.random() * letters.length)]).join('');
    return `EVD-${year}-${randomLetters}${random}`;
}

function getUserInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
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

// Adjust main content padding for footer
function adjustContentPadding() {
    const mainContent = document.querySelector('.main-content');
    const footer = document.querySelector('.footer');
    
    if (mainContent && footer) {
        const footerHeight = footer.offsetHeight;
        mainContent.style.paddingBottom = (footerHeight + 30) + 'px';
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Evidence page loaded');
    
    // Adjust content padding for footer
    adjustContentPadding();
    window.addEventListener('resize', adjustContentPadding);
    
    try {
        // Check authentication
        const userResult = await auth.getCurrentUser();
        if (!userResult.success || !userResult.user) {
            console.log('No user found, redirecting to login');
            window.location.href = 'index.html';
            return;
        }
        
        currentUser = userResult.user;
        console.log('User authenticated:', currentUser.profile?.full_name);
        
        // Display user info
        displayUserInfo();
        
        // Load initial data
        await loadCases();
        await loadEvidence();
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup real-time subscriptions
        setupRealtimeSubscriptions();
        
        // Setup logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Error loading page', 'error');
    }
});

function displayUserInfo() {
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const userAvatarEl = document.getElementById('userAvatar');
    
    if (userNameEl && currentUser.profile) {
        userNameEl.textContent = currentUser.profile.full_name || 'User';
    }
    
    if (userRoleEl && currentUser.profile) {
        userRoleEl.textContent = currentUser.profile.department || 'Digital Forensics';
    }
    
    if (userAvatarEl && currentUser.profile) {
        userAvatarEl.textContent = getUserInitials(currentUser.profile.full_name || 'User');
    }
}

async function loadCases() {
    try {
        const result = await cases.getAllCases();
        if (result.success) {
            allCases = result.data;
            populateCaseDropdowns();
        } else {
            console.error('Failed to load cases:', result.error);
            showToast('Failed to load cases', 'error');
        }
    } catch (error) {
        console.error('Error loading cases:', error);
        showToast('Error loading cases', 'error');
    }
}

function populateCaseDropdowns() {
    // Populate case dropdown in modal
    const caseSelect = document.getElementById('caseNumber');
    if (caseSelect) {
        if (allCases.length > 0) {
            caseSelect.innerHTML = '<option value="">Select Case</option>' +
                allCases.map(c => `<option value="${c.case_number}">${c.case_number} - ${c.case_title}</option>`).join('');
        } else {
            caseSelect.innerHTML = '<option value="">No cases available</option>';
        }
    }
    
    // Populate case filter dropdown
    const filterCaseSelect = document.getElementById('caseFilter');
    if (filterCaseSelect) {
        if (allCases.length > 0) {
            filterCaseSelect.innerHTML = '<option value="all">All Cases</option>' +
                allCases.map(c => `<option value="${c.case_number}">${c.case_number}</option>`).join('');
        } else {
            filterCaseSelect.innerHTML = '<option value="all">All Cases</option>';
        }
    }
}

async function loadEvidence() {
    try {
        const result = await evidence.getAllEvidence();
        if (result.success) {
            allEvidence = result.data;
            applyFilters();
            updateStats();
        } else {
            console.error('Failed to load evidence:', result.error);
            showToast('Failed to load evidence', 'error');
            // Show empty state
            displayEmptyState();
        }
    } catch (error) {
        console.error('Error loading evidence:', error);
        showToast('Error loading evidence', 'error');
        displayEmptyState();
    }
}

function displayEmptyState() {
    const container = document.getElementById('evidenceContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="no-results">
            <i class="fas fa-box-open fa-3x"></i>
            <h3>No Evidence Found</h3>
            <p>There is no evidence in the system yet.</p>
            <button class="btn-primary" onclick="document.getElementById('newEvidenceBtn').click()">
                <i class="fas fa-plus"></i> Add First Evidence
            </button>
        </div>
    `;
    
    // Update stats to zero
    document.getElementById('totalEvidence').textContent = '0';
    document.getElementById('inCustodyCount').textContent = '0';
    document.getElementById('analysisCount').textContent = '0';
    document.getElementById('transferredCount').textContent = '0';
}

function applyFilters() {
    let filtered = [...allEvidence];
    
    // Apply search filter
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(e => 
            (e.evidence_id || '').toLowerCase().includes(searchLower) ||
            (e.description || '').toLowerCase().includes(searchLower) ||
            (e.cases?.case_number || '').toLowerCase().includes(searchLower)
        );
    }
    
    // Apply case filter
    if (filters.case !== 'all') {
        filtered = filtered.filter(e => e.case_number === filters.case);
    }
    
    // Apply status filter
    if (filters.status !== 'all') {
        filtered = filtered.filter(e => e.status === filters.status);
    }
    
    // Apply type filter
    if (filters.type !== 'all') {
        filtered = filtered.filter(e => e.evidence_type === filters.type);
    }
    
    // Apply sorting
    applySorting(filtered);
    
    // Update display
    if (filtered.length === 0 && allEvidence.length > 0) {
        displayNoResults();
    } else {
        displayEvidence(filtered);
    }
    
    updateActiveFilters();
    updatePagination(filtered.length);
}

function displayNoResults() {
    const container = document.getElementById('evidenceContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="no-results">
            <i class="fas fa-search fa-3x"></i>
            <h3>No Matching Evidence</h3>
            <p>No evidence matches your current filters.</p>
            <button class="btn-secondary" onclick="clearAllFilters()">
                <i class="fas fa-times"></i> Clear Filters
            </button>
        </div>
    `;
}

function clearAllFilters() {
    filters = {
        search: '',
        case: 'all',
        status: 'all',
        type: 'all'
    };
    
    // Reset all filter inputs
    const searchInput = document.getElementById('searchEvidence');
    if (searchInput) searchInput.value = '';
    
    const caseFilter = document.getElementById('caseFilter');
    if (caseFilter) caseFilter.value = 'all';
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.value = 'all';
    
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) typeFilter.value = 'all';
    
    currentPage = 1;
    applyFilters();
}

function applySorting(filtered) {
    const sortBy = document.getElementById('sortBy')?.value || 'newest';
    
    switch(sortBy) {
        case 'newest':
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'id':
            filtered.sort((a, b) => (a.evidence_id || '').localeCompare(b.evidence_id || ''));
            break;
    }
}

function displayEvidence(filtered) {
    const container = document.getElementById('evidenceContainer');
    if (!container) return;
    
    // Pagination
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filtered.slice(start, start + itemsPerPage);
    
    if (paginatedItems.length === 0) {
        displayNoResults();
        return;
    }
    
    if (currentView === 'grid') {
        displayGridView(paginatedItems);
    } else {
        displayListView(paginatedItems);
    }
}

function displayGridView(evidence) {
    const container = document.getElementById('evidenceContainer');
    
    container.innerHTML = evidence.map(item => `
        <div class="evidence-card ${item.status}" onclick="viewEvidenceDetails('${item.id}')">
            <div class="card-header">
                <span class="evidence-id">${item.evidence_id}</span>
                <span class="card-badge ${item.evidence_type?.toLowerCase().replace(' ', '-')}">${item.evidence_type || 'N/A'}</span>
            </div>
            <div class="card-body">
                <h3>${(item.description || '').substring(0, 60)}${item.description && item.description.length > 60 ? '...' : ''}</h3>
                <p><i class="fas fa-folder"></i> Case: ${item.cases?.case_number || 'N/A'}</p>
                <div class="evidence-meta">
                    <div class="meta-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${item.current_location || 'Not specified'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-user"></i>
                        <span>${item.current_custodian || 'Unknown'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(item.created_at)}</span>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <span class="status-badge ${item.status}">${formatStatus(item.status)}</span>
                <div class="card-actions">
                    <button onclick="editEvidence('${item.id}'); event.stopPropagation();" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="viewCOC('${item.id}'); event.stopPropagation();" title="View Chain of Custody">
                        <i class="fas fa-history"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function displayListView(evidence) {
    const container = document.getElementById('evidenceContainer');
    
    container.innerHTML = `
        <div class="evidence-list">
            <div class="list-header">
                <span>Evidence ID</span>
                <span>Description</span>
                <span>Case</span>
                <span>Type</span>
                <span>Location</span>
                <span>Status</span>
                <span>Actions</span>
            </div>
            ${evidence.map(item => `
                <div class="list-item" onclick="viewEvidenceDetails('${item.id}')">
                    <span class="evidence-id">${item.evidence_id}</span>
                    <span class="evidence-title">${(item.description || '').substring(0, 40)}${item.description && item.description.length > 40 ? '...' : ''}</span>
                    <span>${item.cases?.case_number || 'N/A'}</span>
                    <span class="evidence-type ${item.evidence_type?.toLowerCase().replace(' ', '-')}">${item.evidence_type || 'N/A'}</span>
                    <span class="evidence-location">${item.current_location || 'N/A'}</span>
                    <span class="status-badge ${item.status}">${formatStatus(item.status)}</span>
                    <div class="list-actions">
                        <button onclick="editEvidence('${item.id}'); event.stopPropagation();" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="viewCOC('${item.id}'); event.stopPropagation();" title="View Chain of Custody">
                            <i class="fas fa-history"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function formatStatus(status) {
    if (!status) return 'Unknown';
    const statusMap = {
        'in-custody': 'In Custody',
        'analyzing': 'Under Analysis',
        'completed': 'Analysis Complete',
        'transferred': 'Transferred'
    };
    return statusMap[status] || status;
}

function updateStats() {
    document.getElementById('totalEvidence').textContent = allEvidence.length;
    document.getElementById('inCustodyCount').textContent = 
        allEvidence.filter(e => e.status === 'in-custody').length;
    document.getElementById('analysisCount').textContent = 
        allEvidence.filter(e => e.status === 'analyzing').length;
    document.getElementById('transferredCount').textContent = 
        allEvidence.filter(e => e.status === 'transferred').length;
}

function updateActiveFilters() {
    const container = document.getElementById('activeFilters');
    if (!container) return;
    
    const activeFilters = [];
    
    if (filters.search) {
        activeFilters.push(`
            <span class="filter-tag">
                Search: ${filters.search}
                <i class="fas fa-times" onclick="removeFilter('search')"></i>
            </span>
        `);
    }
    
    if (filters.case !== 'all') {
        activeFilters.push(`
            <span class="filter-tag">
                Case: ${filters.case}
                <i class="fas fa-times" onclick="removeFilter('case')"></i>
            </span>
        `);
    }
    
    if (filters.status !== 'all') {
        activeFilters.push(`
            <span class="filter-tag">
                Status: ${formatStatus(filters.status)}
                <i class="fas fa-times" onclick="removeFilter('status')"></i>
            </span>
        `);
    }
    
    if (filters.type !== 'all') {
        activeFilters.push(`
            <span class="filter-tag">
                Type: ${filters.type}
                <i class="fas fa-times" onclick="removeFilter('type')"></i>
            </span>
        `);
    }
    
    container.innerHTML = activeFilters.join('');
    
    // Hide container if no active filters
    if (activeFilters.length === 0) {
        container.style.display = 'none';
    } else {
        container.style.display = 'flex';
    }
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
    // New evidence button
    const newEvidenceBtn = document.getElementById('newEvidenceBtn');
    if (newEvidenceBtn) {
        newEvidenceBtn.addEventListener('click', openNewEvidenceModal);
    }
    
    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportEvidence);
    }
    
    // Search input
    const searchInput = document.getElementById('searchEvidence');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            filters.search = e.target.value;
            currentPage = 1;
            applyFilters();
        }, 500));
    }
    
    // Case filter
    const caseFilter = document.getElementById('caseFilter');
    if (caseFilter) {
        caseFilter.addEventListener('change', (e) => {
            filters.case = e.target.value;
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
    
    // Type filter
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            filters.type = e.target.value;
            currentPage = 1;
            applyFilters();
        });
    }
    
    // Sort by
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', () => {
            applyFilters();
        });
    }
    
    // View toggle
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            e.target.closest('.toggle-btn').classList.add('active');
            currentView = e.target.closest('.toggle-btn').dataset.view;
            applyFilters();
        });
    });
    
    // Evidence form submission
    const evidenceForm = document.getElementById('evidenceForm');
    if (evidenceForm) {
        evidenceForm.addEventListener('submit', handleEvidenceSubmit);
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

function openNewEvidenceModal() {
    // Check if there are cases available
    if (allCases.length === 0) {
        showToast('Please create a case first before adding evidence', 'warning');
        return;
    }
    
    // Generate new evidence ID
    document.getElementById('evidenceId').value = generateEvidenceId();
    
    // Set current date/time
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('acquisitionDate').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    // Clear other fields
    document.getElementById('evidenceDescription').value = '';
    document.getElementById('evidenceType').value = '';
    document.getElementById('evidenceCategory').value = '';
    document.getElementById('serialNumber').value = '';
    document.getElementById('model').value = '';
    document.getElementById('location').value = '';
    document.getElementById('custodian').value = currentUser.profile?.full_name || '';
    document.getElementById('evidenceStatus').value = 'in-custody';
    document.getElementById('evidenceNotes').value = '';
    document.getElementById('cocFrom').value = '';
    document.getElementById('cocTo').value = '';
    document.getElementById('cocPurpose').value = '';
    
    // Show modal
    document.getElementById('evidenceModal').style.display = 'flex';
}

async function handleEvidenceSubmit(e) {
    e.preventDefault();
    
    // Validate required fields
    const caseNumber = document.getElementById('caseNumber').value;
    const description = document.getElementById('evidenceDescription').value;
    const evidenceType = document.getElementById('evidenceType').value;
    
    if (!caseNumber) {
        showToast('Please select a case', 'error');
        return;
    }
    
    if (!description) {
        showToast('Please enter evidence description', 'error');
        return;
    }
    
    if (!evidenceType) {
        showToast('Please select evidence type', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('#evidenceForm .btn-primary');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    try {
        const evidenceData = {
            evidence_id: document.getElementById('evidenceId').value,
            case_number: caseNumber,
            description: description,
            evidence_type: evidenceType,
            category: document.getElementById('evidenceCategory').value,
            serial_number: document.getElementById('serialNumber').value,
            model: document.getElementById('model').value,
            current_location: document.getElementById('location').value,
            current_custodian: document.getElementById('custodian').value,
            acquisition_date: document.getElementById('acquisitionDate').value,
            status: document.getElementById('evidenceStatus').value,
            notes: document.getElementById('evidenceNotes').value,
            created_by: currentUser?.user?.id
        };
        
        const result = await evidence.createEvidence(evidenceData);
        
        if (result.success) {
            // Create initial COC entry if provided
            const cocFrom = document.getElementById('cocFrom').value;
            const cocTo = document.getElementById('cocTo').value;
            const cocPurpose = document.getElementById('cocPurpose').value;
            
            if (cocFrom && cocTo) {
                await chainOfCustody.createCOCEntry({
                    evidence_id: result.data.id,
                    from_location: cocFrom,
                    to_location: cocTo,
                    purpose: cocPurpose,
                    transferred_by: currentUser?.user?.id,
                    transfer_date: new Date().toISOString()
                });
            }
            
            showToast('Evidence created successfully', 'success');
            closeModal();
            await loadEvidence();
        } else {
            showToast(result.error || 'Failed to create evidence', 'error');
        }
    } catch (error) {
        console.error('Error creating evidence:', error);
        showToast('Error creating evidence', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Make functions globally available
window.viewEvidenceDetails = async function(evidenceId) {
    const evidenceItem = allEvidence.find(e => e.id === evidenceId);
    if (!evidenceItem) return;
    
    // Load COC history
    const cocResult = await chainOfCustody.getEvidenceCOC(evidenceId);
    
    const modal = document.getElementById('viewEvidenceModal');
    const detailsContainer = document.getElementById('evidenceDetails');
    const timelineContainer = document.getElementById('cocTimeline');
    
    if (!modal || !detailsContainer || !timelineContainer) return;
    
    detailsContainer.innerHTML = `
        <div class="detail-section">
            <h3><i class="fas fa-info-circle"></i> Basic Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="label">Evidence ID</span>
                    <span class="value">${evidenceItem.evidence_id}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Case Number</span>
                    <span class="value">${evidenceItem.cases?.case_number || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Case Title</span>
                    <span class="value">${evidenceItem.cases?.case_title || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Type</span>
                    <span class="value">${evidenceItem.evidence_type || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Category</span>
                    <span class="value">${evidenceItem.category || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Status</span>
                    <span class="value">
                        <span class="status-badge ${evidenceItem.status}">${formatStatus(evidenceItem.status)}</span>
                    </span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3><i class="fas fa-align-left"></i> Description</h3>
            <p>${evidenceItem.description || 'No description provided'}</p>
        </div>
        
        <div class="detail-section">
            <h3><i class="fas fa-microchip"></i> Physical Details</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="label">Serial Number</span>
                    <span class="value">${evidenceItem.serial_number || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Model/Manufacturer</span>
                    <span class="value">${evidenceItem.model || 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3><i class="fas fa-map-marker-alt"></i> Current Location</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="label">Location</span>
                    <span class="value">${evidenceItem.current_location || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Custodian</span>
                    <span class="value">${evidenceItem.current_custodian || 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3><i class="fas fa-clock"></i> Dates</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="label">Acquisition Date</span>
                    <span class="value">${formatDate(evidenceItem.acquisition_date)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Created</span>
                    <span class="value">${formatDate(evidenceItem.created_at)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Last Updated</span>
                    <span class="value">${formatDate(evidenceItem.updated_at || evidenceItem.created_at)}</span>
                </div>
            </div>
        </div>
        
        ${evidenceItem.notes ? `
        <div class="detail-section">
            <h3><i class="fas fa-sticky-note"></i> Notes</h3>
            <p>${evidenceItem.notes}</p>
        </div>
        ` : ''}
    `;
    
    // Display COC timeline
    if (cocResult.success && cocResult.data.length > 0) {
        timelineContainer.innerHTML = cocResult.data.map(entry => `
            <div class="timeline-item">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <span class="timeline-title">Transfer</span>
                        <span class="timeline-date">${formatDate(entry.transfer_date)}</span>
                    </div>
                    <div class="timeline-body">
                        <p><strong>From:</strong> ${entry.from_location}</p>
                        <p><strong>To:</strong> ${entry.to_location}</p>
                        <p><strong>Purpose:</strong> ${entry.purpose || 'Not specified'}</p>
                        <p><strong>Transferred by:</strong> ${entry.profiles?.full_name || 'Unknown'}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        timelineContainer.innerHTML = '<p class="text-center">No chain of custody entries found</p>';
    }
    
    modal.style.display = 'flex';
};

window.editEvidence = async function(evidenceId) {
    const evidenceItem = allEvidence.find(e => e.id === evidenceId);
    if (!evidenceItem) return;
    
    document.getElementById('evidenceId').value = evidenceItem.evidence_id;
    document.getElementById('caseNumber').value = evidenceItem.case_number || '';
    document.getElementById('evidenceDescription').value = evidenceItem.description || '';
    document.getElementById('evidenceType').value = evidenceItem.evidence_type || '';
    document.getElementById('evidenceCategory').value = evidenceItem.category || '';
    document.getElementById('serialNumber').value = evidenceItem.serial_number || '';
    document.getElementById('model').value = evidenceItem.model || '';
    document.getElementById('location').value = evidenceItem.current_location || '';
    document.getElementById('custodian').value = evidenceItem.current_custodian || '';
    
    if (evidenceItem.acquisition_date) {
        const date = new Date(evidenceItem.acquisition_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        document.getElementById('acquisitionDate').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    } else {
        document.getElementById('acquisitionDate').value = '';
    }
    
    document.getElementById('evidenceStatus').value = evidenceItem.status || 'in-custody';
    document.getElementById('evidenceNotes').value = evidenceItem.notes || '';
    
    // Clear COC fields
    document.getElementById('cocFrom').value = '';
    document.getElementById('cocTo').value = '';
    document.getElementById('cocPurpose').value = '';
    
    document.getElementById('evidenceModal').style.display = 'flex';
};

window.viewCOC = function(evidenceId) {
    viewEvidenceDetails(evidenceId);
    
    // Scroll to timeline
    setTimeout(() => {
        const timeline = document.querySelector('.coc-timeline');
        if (timeline) {
            timeline.scrollIntoView({ behavior: 'smooth' });
        }
    }, 300);
};

window.removeFilter = function(filterName) {
    filters[filterName] = filterName === 'search' ? '' : 'all';
    
    if (filterName === 'search') {
        const searchInput = document.getElementById('searchEvidence');
        if (searchInput) searchInput.value = '';
    } else {
        const filterElement = document.getElementById(`${filterName}Filter`);
        if (filterElement) filterElement.value = 'all';
    }
    
    currentPage = 1;
    applyFilters();
};

window.goToPage = function(page) {
    currentPage = page;
    applyFilters();
};

function exportEvidence() {
    if (allEvidence.length === 0) {
        showToast('No evidence to export', 'warning');
        return;
    }
    
    try {
        const data = allEvidence.map(e => ({
            'Evidence ID': e.evidence_id,
            'Case Number': e.cases?.case_number || e.case_number,
            'Description': e.description,
            'Type': e.evidence_type,
            'Status': formatStatus(e.status),
            'Location': e.current_location,
            'Custodian': e.current_custodian,
            'Acquisition Date': formatDate(e.acquisition_date),
            'Created': formatDate(e.created_at)
        }));
        
        const csv = convertToCSV(data);
        downloadCSV(csv, 'evidence_export.csv');
        showToast('Evidence exported successfully', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Error exporting evidence', 'error');
    }
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    csvRows.push(headers.join(','));
    
    for (const row of data) {
        const values = headers.map(header => {
            let value = row[header]?.toString() || '';
            // Escape quotes and wrap in quotes if contains comma
            value = value.replace(/"/g, '""');
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = `"${value}"`;
            }
            return value;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function setupRealtimeSubscriptions() {
    realtime.subscribeToEvidence((payload) => {
        console.log('Evidence updated:', payload);
        loadEvidence();
    });
}

window.closeModal = function() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    const form = document.getElementById('evidenceForm');
    if (form) form.reset();
};

async function handleLogout() {
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
        console.error('Logout error:', error);
        showToast('Error logging out', 'error');
    }
}

// Make functions globally available
window.closeModal = closeModal;
window.removeFilter = removeFilter;
window.goToPage = goToPage;
window.viewEvidenceDetails = viewEvidenceDetails;
window.editEvidence = editEvidence;
window.viewCOC = viewCOC;
window.clearAllFilters = clearAllFilters;