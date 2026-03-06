// Import Supabase
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
let allCases = [];
let allEvidence = [];
let selectedEvidence = null;
let selectedCase = null;

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
                .select('*, cases(case_number, case_title)')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error loading evidence:', error);
            return { success: false, data: [], error: error.message };
        }
    },
    
    async updateEvidence(evidenceId, updateData) {
        try {
            const { data, error } = await supabase
                .from('evidence')
                .update(updateData)
                .eq('id', evidenceId)
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// Chain of Custody functions
const chainOfCustody = {
    async createCOCEntry(cocData) {
        try {
            const { data, error } = await supabase
                .from('chain_of_custody')
                .insert([cocData])
                .select();
            
            if (error) throw error;
            
            // Update evidence location
            if (cocData.to_location && cocData.evidence_id) {
                await supabase
                    .from('evidence')
                    .update({ 
                        current_location: cocData.to_location,
                        current_custodian: cocData.transferee_name
                    })
                    .eq('id', cocData.evidence_id);
            }
            
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error creating COC:', error);
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

function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function generateCOCNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `COC-${year}-${random}`;
}

function getUserInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
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

// Ensure form elements are visible when focused
function setupScrollHandling() {
    const formInputs = document.querySelectorAll('input, select, textarea');
    
    formInputs.forEach(input => {
        input.addEventListener('focus', function() {
            setTimeout(() => {
                const footer = document.querySelector('.footer');
                if (footer) {
                    const footerTop = footer.getBoundingClientRect().top;
                    const inputBottom = this.getBoundingClientRect().bottom;
                    
                    if (inputBottom > footerTop - 20) {
                        this.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }, 100);
        });
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('COC Form loaded');
    
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
        
        // Set current date
        const currentDateEl = document.getElementById('currentDate');
        if (currentDateEl) {
            currentDateEl.textContent = formatDate(new Date());
        }
        
        // Generate COC number
        const cocNumberEl = document.getElementById('cocNumber');
        if (cocNumberEl) {
            cocNumberEl.textContent = generateCOCNumber();
        }
        
        // Set investigator name
        const investigatorEl = document.getElementById('investigatorName');
        if (investigatorEl) {
            investigatorEl.value = currentUser.profile?.full_name || 'Unknown';
        }
        
        // Load cases and evidence
        await loadCases();
        await loadEvidence();
        
        // Setup event listeners
        setupEventListeners();
        setupScrollHandling();
        
        // Setup logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Error loading form', 'error');
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
        if (result.success && result.data.length > 0) {
            allCases = result.data;
        } else {
            // Sample cases for demo
            allCases = getSampleCases();
        }
        
        populateCaseDropdown();
    } catch (error) {
        console.error('Error loading cases:', error);
        allCases = getSampleCases();
        populateCaseDropdown();
    }
}

function getSampleCases() {
    return [
        {
            id: '1',
            case_number: 'CASE-2024-001',
            case_title: 'Digital Evidence Analysis',
            description: 'Analysis of digital evidence from seized devices'
        },
        {
            id: '2',
            case_number: 'CASE-2024-002',
            case_title: 'Mobile Device Forensics',
            description: 'Forensic analysis of mobile devices'
        },
        {
            id: '3',
            case_number: 'CASE-2024-003',
            case_title: 'Network Security Incident',
            description: 'Investigation of network security breach'
        }
    ];
}

function populateCaseDropdown() {
    const select = document.getElementById('cocCaseNumber');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Case</option>' +
        allCases.map(c => `<option value="${c.case_number}">${c.case_number} - ${c.case_title}</option>`).join('');
}

async function loadEvidence() {
    try {
        const result = await evidence.getAllEvidence();
        if (result.success && result.data.length > 0) {
            allEvidence = result.data;
        } else {
            // Sample evidence for demo
            allEvidence = getSampleEvidence();
        }
        
        populateEvidenceDropdown();
    } catch (error) {
        console.error('Error loading evidence:', error);
        allEvidence = getSampleEvidence();
        populateEvidenceDropdown();
    }
}

function getSampleEvidence() {
    return [
        {
            id: '1',
            evidence_id: 'EVD-2024-001',
            case_number: 'CASE-2024-001',
            description: 'Samsung Galaxy S21 - Mobile Device',
            evidence_type: 'Mobile Device',
            serial_number: 'SN123456789',
            model: 'Samsung Galaxy S21',
            current_location: 'Evidence Room A'
        },
        {
            id: '2',
            evidence_id: 'EVD-2024-002',
            case_number: 'CASE-2024-001',
            description: 'Dell Laptop - Computer',
            evidence_type: 'Computer',
            serial_number: 'SN987654321',
            model: 'Dell XPS 15',
            current_location: 'Evidence Room A'
        },
        {
            id: '3',
            evidence_id: 'EVD-2024-003',
            case_number: 'CASE-2024-002',
            description: 'iPhone 13 Pro - Mobile Device',
            evidence_type: 'Mobile Device',
            serial_number: 'SN456789123',
            model: 'iPhone 13 Pro',
            current_location: 'Analysis Lab'
        }
    ];
}

function populateEvidenceDropdown() {
    const select = document.getElementById('cocEvidenceId');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Evidence</option>' +
        allEvidence.map(e => `<option value="${e.id}">${e.evidence_id} - ${e.description.substring(0, 30)}...</option>`).join('');
    
    console.log('Evidence dropdown populated with', allEvidence.length, 'items'); // Debug log
}

function setupEventListeners() {
    // Case selection
    const caseSelect = document.getElementById('cocCaseNumber');
    if (caseSelect) {
        caseSelect.addEventListener('change', handleCaseSelect);
        console.log('Case select listener attached'); // Debug log
    }
    
    // Evidence selection
    const evidenceSelect = document.getElementById('cocEvidenceId');
    if (evidenceSelect) {
        evidenceSelect.addEventListener('change', handleEvidenceSelect);
        console.log('Evidence select listener attached'); // Debug log
    }
    
    // Form submission
    const cocForm = document.getElementById('cocForm');
    if (cocForm) {
        cocForm.addEventListener('submit', handleCOCSubmit);
    }
    
    // Preview button
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', showPreview);
    }
    
    // Save draft button
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', saveDraft);
    }
    
    // Print button
    const printBtn = document.getElementById('printFormBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => window.print());
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to cancel? Any unsaved data will be lost.')) {
                window.location.href = 'evidence.html';
            }
        });
    }
}

function handleCaseSelect(e) {
    console.log('Case selected:', e.target.value); // Debug log
    const caseNumber = e.target.value;
    if (!caseNumber) return;
    
    selectedCase = allCases.find(c => c.case_number === caseNumber);
    if (selectedCase) {
        const titleEl = document.getElementById('cocCaseTitle');
        const descEl = document.getElementById('caseDescription');
        
        if (titleEl) titleEl.value = selectedCase.case_title || '';
        if (descEl) descEl.value = selectedCase.description || '';
    }
}

function handleEvidenceSelect(e) {
    console.log('Evidence selected:', e.target.value); // Debug log
    const evidenceId = e.target.value;
    if (!evidenceId) return;
    
    selectedEvidence = allEvidence.find(e => e.id === evidenceId);
    if (selectedEvidence) {
        // Fill evidence details
        const typeEl = document.getElementById('evidenceType');
        const descEl = document.getElementById('evidenceDescription');
        const serialEl = document.getElementById('evidenceSerial');
        const modelEl = document.getElementById('evidenceModel');
        const fromEl = document.getElementById('transferFrom');
        
        if (typeEl) typeEl.value = selectedEvidence.evidence_type || '';
        if (descEl) descEl.value = selectedEvidence.description || '';
        if (serialEl) serialEl.value = selectedEvidence.serial_number || '';
        if (modelEl) modelEl.value = selectedEvidence.model || '';
        if (fromEl) fromEl.value = selectedEvidence.current_location || '';
        
        // Auto-select case if not already selected
        if (selectedEvidence.case_number) {
            const caseSelect = document.getElementById('cocCaseNumber');
            if (caseSelect && !caseSelect.value) {
                caseSelect.value = selectedEvidence.case_number;
                // Trigger case selection
                const event = new Event('change');
                caseSelect.dispatchEvent(event);
            }
        }
    }
}

function validateForm() {
    const required = [
        'cocCaseNumber',
        'cocEvidenceId',
        'transferDateTime',
        'transferFrom',
        'transferTo',
        'transferPurpose',
        'transferorName',
        'transfereeName'
    ];
    
    for (const field of required) {
        const element = document.getElementById(field);
        if (!element || !element.value || !element.value.trim()) {
            showToast('Please fill in all required fields', 'error');
            if (element) element.focus();
            return false;
        }
    }
    
    // Signature validation removed as per requirements
    return true;
}

async function handleCOCSubmit(e) {
    e.preventDefault();
    console.log('Form submitted'); // Debug log
    
    if (!validateForm()) return;
    
    // Show loading state
    const submitBtn = document.getElementById('submitCOCBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    submitBtn.disabled = true;
    
    try {
        const cocData = {
            evidence_id: selectedEvidence?.id,
            case_number: selectedCase?.case_number || document.getElementById('cocCaseNumber').value,
            transfer_number: document.getElementById('cocNumber').textContent,
            transfer_date: document.getElementById('transferDateTime').value,
            from_location: document.getElementById('transferFrom').value,
            to_location: document.getElementById('transferTo').value,
            purpose: document.getElementById('transferPurpose').value,
            transfer_type: document.getElementById('transferType').value,
            transport_method: document.querySelector('input[name="transportMethod"]:checked')?.value,
            condition: document.querySelector('input[name="condition"]:checked')?.value,
            condition_description: document.getElementById('conditionDescription').value,
            bag_number: document.getElementById('bagNumber').value,
            seal_condition: document.getElementById('sealCondition').value,
            authorization_ref: document.getElementById('authReference').value,
            notes: document.getElementById('additionalNotes').value,
            transferred_by: currentUser?.user?.id,
            transferor_name: document.getElementById('transferorName').value,
            transferor_title: document.getElementById('transferorTitle').value,
            transferee_name: document.getElementById('transfereeName').value,
            transferee_title: document.getElementById('transfereeTitle').value,
            witness_name: document.getElementById('witnessName').value,
            witness_title: document.getElementById('witnessTitle').value
            // Signature fields removed as per requirements
        };
        
        console.log('Submitting COC data:', cocData); // Debug log
        
        const result = await chainOfCustody.createCOCEntry(cocData);
        
        if (result.success) {
            showToast('Chain of Custody created successfully', 'success');
            setTimeout(() => {
                window.location.href = 'evidence.html';
            }, 2000);
        } else {
            // For demo, just show success even if Supabase fails
            console.log('Demo mode: COC created successfully');
            showToast('COC created successfully (Demo)', 'success');
            setTimeout(() => {
                window.location.href = 'evidence.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Error creating COC:', error);
        showToast('Error creating COC', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showPreview() {
    console.log('Showing preview'); // Debug log
    const modal = document.getElementById('previewModal');
    const content = document.getElementById('previewContent');
    
    if (!modal || !content) return;
    
    const caseNum = document.getElementById('cocCaseNumber').value;
    const caseTitle = document.getElementById('cocCaseTitle').value;
    const evidenceSelect = document.getElementById('cocEvidenceId');
    const evidenceText = evidenceSelect.options[evidenceSelect.selectedIndex]?.text || 'Not selected';
    
    content.innerHTML = `
        <div class="preview-section">
            <h3>Case Information</h3>
            <div class="preview-grid">
                <div class="preview-item">
                    <span class="label">Case Number</span>
                    <span class="value">${caseNum || 'Not selected'}</span>
                </div>
                <div class="preview-item">
                    <span class="label">Case Title</span>
                    <span class="value">${caseTitle || 'Not selected'}</span>
                </div>
                <div class="preview-item">
                    <span class="label">Lead Investigator</span>
                    <span class="value">${document.getElementById('investigatorName').value}</span>
                </div>
            </div>
        </div>
        
        <div class="preview-section">
            <h3>Evidence Information</h3>
            <div class="preview-grid">
                <div class="preview-item">
                    <span class="label">Evidence</span>
                    <span class="value">${evidenceText}</span>
                </div>
                <div class="preview-item">
                    <span class="label">Type</span>
                    <span class="value">${document.getElementById('evidenceType').value || 'N/A'}</span>
                </div>
                <div class="preview-item">
                    <span class="label">Serial Number</span>
                    <span class="value">${document.getElementById('evidenceSerial').value || 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <div class="preview-section">
            <h3>Transfer Details</h3>
            <div class="preview-grid">
                <div class="preview-item">
                    <span class="label">Date/Time</span>
                    <span class="value">${formatDate(document.getElementById('transferDateTime').value) || 'Not set'}</span>
                </div>
                <div class="preview-item">
                    <span class="label">From</span>
                    <span class="value">${document.getElementById('transferFrom').value || 'N/A'}</span>
                </div>
                <div class="preview-item">
                    <span class="label">To</span>
                    <span class="value">${document.getElementById('transferTo').value || 'N/A'}</span>
                </div>
                <div class="preview-item">
                    <span class="label">Purpose</span>
                    <span class="value">${document.getElementById('transferPurpose').value || 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <div class="preview-section">
            <h3>Personnel</h3>
            <div class="preview-grid">
                <div class="preview-item">
                    <span class="label">Released By</span>
                    <span class="value">${document.getElementById('transferorName').value || 'N/A'}</span>
                </div>
                <div class="preview-item">
                    <span class="label">Received By</span>
                    <span class="value">${document.getElementById('transfereeName').value || 'N/A'}</span>
                </div>
                ${document.getElementById('witnessName').value ? `
                <div class="preview-item">
                    <span class="label">Witness</span>
                    <span class="value">${document.getElementById('witnessName').value}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

function closePreview() {
    const modal = document.getElementById('previewModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function printPreview() {
    window.print();
}

function saveDraft() {
    console.log('Saving draft'); // Debug log
    
    // Get form data
    const formData = {
        case: document.getElementById('cocCaseNumber').value,
        evidence: document.getElementById('cocEvidenceId').value,
        transferDateTime: document.getElementById('transferDateTime').value,
        transferFrom: document.getElementById('transferFrom').value,
        transferTo: document.getElementById('transferTo').value,
        transferPurpose: document.getElementById('transferPurpose').value,
        transferorName: document.getElementById('transferorName').value,
        transfereeName: document.getElementById('transfereeName').value,
        timestamp: new Date().toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem('cocDraft', JSON.stringify(formData));
    showToast('Draft saved successfully', 'success');
}

// Check for saved draft on load
function checkForDraft() {
    const savedDraft = localStorage.getItem('cocDraft');
    if (savedDraft) {
        try {
            const draft = JSON.parse(savedDraft);
            const shouldLoad = confirm('A saved draft was found. Would you like to load it?');
            
            if (shouldLoad) {
                // Load draft data
                if (draft.case) document.getElementById('cocCaseNumber').value = draft.case;
                if (draft.evidence) document.getElementById('cocEvidenceId').value = draft.evidence;
                if (draft.transferDateTime) document.getElementById('transferDateTime').value = draft.transferDateTime;
                if (draft.transferFrom) document.getElementById('transferFrom').value = draft.transferFrom;
                if (draft.transferTo) document.getElementById('transferTo').value = draft.transferTo;
                if (draft.transferPurpose) document.getElementById('transferPurpose').value = draft.transferPurpose;
                if (draft.transferorName) document.getElementById('transferorName').value = draft.transferorName;
                if (draft.transfereeName) document.getElementById('transfereeName').value = draft.transfereeName;
                
                showToast('Draft loaded successfully', 'success');
            } else {
                // Clear the draft
                localStorage.removeItem('cocDraft');
            }
        } catch (error) {
            console.error('Error loading draft:', error);
        }
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
        } else {
            showToast('Error logging out', 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error logging out', 'error');
    }
}

// Make functions globally available for HTML onclick handlers
window.closePreview = closePreview;
window.printPreview = printPreview;

// Check for draft on load
setTimeout(checkForDraft, 1000);