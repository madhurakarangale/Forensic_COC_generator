// Format time ago
export function formatTimeAgo(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
    
    return formatDate(dateString)
}

// Convert to CSV
export function convertToCSV(data) {
    if (!data || data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    const csvRows = []
    
    csvRows.push(headers.join(','))
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header]?.toString().replace(/"/g, '""') || ''
            return `"${value}"`
        })
        csvRows.push(values.join(','))
    }
    
    return csvRows.join('\n')
}

// Download CSV
export function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

// Validate form fields
export function validateForm(formId, requiredFields) {
    const form = document.getElementById(formId)
    if (!form) return false
    
    for (const field of requiredFields) {
        const element = form.querySelector(`[name="${field}"], #${field}`)
        if (!element || !element.value.trim()) {
            showToast(`Field ${field} is required`, 'error')
            element?.focus()
            return false
        }
    }
    
    return true
}

// Show loading spinner
export function showLoading(containerId) {
    const container = document.getElementById(containerId)
    if (!container) return
    
    container.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin fa-3x"></i>
            <p>Loading...</p>
        </div>
    `
}

// Hide loading spinner
export function hideLoading(containerId) {
    const container = document.getElementById(containerId)
    if (!container) return
    
    // Remove spinner if it was the only content
    if (container.querySelector('.loading-spinner')) {
        container.innerHTML = ''
    }
}

// Confirm action
export function confirmAction(message, callback) {
    if (confirm(message)) {
        callback()
    }
}

// Get URL parameters
export function getUrlParams() {
    const params = new URLSearchParams(window.location.search)
    const result = {}
    
    for (const [key, value] of params) {
        result[key] = value
    }
    
    return result
}

// Set page title
export function setPageTitle(title) {
    document.title = `${title} - Forensic COC System`
}

// Check if value is empty
export function isEmpty(value) {
    return value === null || value === undefined || value === ''
}

// Deep clone object
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj))
}