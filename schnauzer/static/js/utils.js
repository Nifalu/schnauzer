// utils.js - Utility functions for the graph visualization

/**
 * Truncates text to a specified length and adds ellipsis if needed
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 */
function truncateText(text, maxLength = 150) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Format node data for display in details panel
 * @param {Object} node - The node data object
 * @returns {string} HTML formatted node details
 */
function formatNodeDetails(node) {
    if (!node) return '';

    let html = `
        <p><strong>ID:</strong> ${node.id || 'Unknown'}</p>
    `;

    // Add any available properties
    if (node.label) html += `<p><strong>Label:</strong> ${node.label}</p>`;
    if (node.type) html += `<p><strong>Type:</strong> ${node.type}</p>`;
    if (node.category) html += `<p><strong>Category:</strong> ${node.category}</p>`;

    // Add description if available
    if (node.description) {
        html += `
            <hr>
            <h6>Description</h6>
            <div class="node-description">${node.description.replace(/\n/g, '<br>')}</div>
        `;
    }

    // Add any additional properties
    const standardProps = ['id', 'label', 'type', 'category', 'description'];
    const additionalProps = Object.keys(node).filter(key => !standardProps.includes(key));

    if (additionalProps.length > 0) {
        html += `<hr><h6>Additional Properties</h6>`;
        additionalProps.forEach(key => {
            html += `<p><strong>${key}:</strong> ${node[key]}</p>`;
        });
    }

    return html;
}

/**
 * Generate a color based on a string (consistent hashing)
 * @param {string} str - Input string to generate color from
 * @returns {string} Hex color code
 */
function stringToColor(str) {
    if (!str) return '#9467bd'; // Default color

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert to hex color
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }

    return color;
}

/**
 * Calculate contrast color (black or white) based on background color
 * @param {string} hexColor - Hex color code
 * @returns {string} '#ffffff' or '#000000' depending on contrast
 */
function getContrastColor(hexColor) {
    // Default to black if invalid color
    if (!hexColor || hexColor.length < 7) return '#000000';

    // Convert hex to RGB
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black for light colors, white for dark colors
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Download current graph data as JSON file
 * @param {Object} graphData - The graph data to download
 * @param {string} filename - Optional filename
 */
function downloadGraphJSON(graphData, filename = 'graph-data.json') {
    if (!graphData) return;

    // Create JSON string with pretty formatting
    const jsonStr = JSON.stringify(graphData, null, 2);

    // Create download link
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create temporary link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Get URL parameters as an object
 * @returns {Object} Parameter key-value pairs
 */
function getUrlParams() {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);

    for (const [key, value] of searchParams.entries()) {
        params[key] = value;
    }

    return params;
}

// Export utility functions to global namespace
window.SchGraphApp = window.SchGraphApp || {};
window.SchGraphApp.utils = {
    truncateText,
    formatNodeDetails,
    stringToColor,
    getContrastColor,
    downloadGraphJSON,
    getUrlParams
};