// utils.js - Utility functions for the graph visualization
function escapeHTML(str = '') {
    if (str === null || str === undefined) {
        return null;
    }
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}

/**
 * Format node data for display in details panel
 * @param {Object} node - The node data object
 * @returns {string} HTML formatted node details
 */
function formatNodeDetails(node) {
    // Debug output to see what data is actually being received
    if (!node) return '<p>No node data available</p>';

    let html = '';

    // Show node name at the top
    html += `<p><strong>Name:</strong> ${escapeHTML(node.name) || 'Unknown'}</p>`;
    html += `<p><strong>Type:</strong> ${escapeHTML(node.type) || 'Unknown'}</p>`;

    // Show all attributes except special ones
    const specialKeys = ['id', 'name', 'type', 'color', 'x', 'y', 'description'];

    for (const [key, value] of Object.entries(node)) {
        if (!specialKeys.includes(key) && value !== undefined && value !== null) {
            html += `<p><strong>${escapeHTML(key)}:</strong> ${escapeHTML(value)}</p>`;
        }
    }

    // Add description if available
    if (node.description) {
        html += `
            <hr>
            <h6>Description</h6>
            <div class="node-description">${escapeHTML(node.description)}</div>
        `;
    }

    return html;
}

/**
 * Format edge data for display in details panel
 * @param {Object} edge - The edge data object
 * @returns {string} HTML formatted edge details
 */
function formatEdgeDetails(edge) {
    if (!edge) return '';

    let html = '';

    // Show edge name at the top if available
    if (edge.name) {
        html += `<p><strong>Name:</strong> ${escapeHTML(edge.name)}</p>`;
    }

    if (edge.type) {
        html += `<p><strong>Type:</strong> ${escapeHTML(edge.type)}</p>`;
    }

    // Show source and target
    html += `<p><strong>Source:</strong> ${escapeHTML(edge.source)}</p>`;
    html += `<p><strong>Target:</strong> ${escapeHTML(edge.target)}</p>`;

    // Show all other attributes
    const specialKeys = ['id', 'name', 'type', 'source', 'target', 'color', 'description'];

    for (const [key, value] of Object.entries(edge)) {
        if (!specialKeys.includes(key) && value !== undefined && value !== null) {
            html += `<p><strong>${escapeHTML(key)}:</strong> ${escapeHTML(value)}</p>`;
        }
    }

    // Add description if available
    if (edge.description) {
        html += `
            <hr>
            <h6>Description</h6>
            <div class="node-description">${escapeHTML(edge.description)}</div>
        `;
    }

    return html;
}

/**
 * Determine if text should be black or white based on background color
 * @param {string} bgColor - Background color in hex format
 * @returns {string} Text color in hex format
 */
function getTextColor(bgColor) {
    // If no color provided, default to white
    if (!bgColor) return "#ffffff";

    // Remove the '#' if it exists
    const color = bgColor.startsWith('#') ? bgColor.substring(1) : bgColor;

    // Handle 3-digit hex codes by expanding to 6 digits
    const normalizedColor = color.length === 3
        ? color[0] + color[0] + color[1] + color[1] + color[2] + color[2]
        : color;

    // Convert to RGB
    const r = parseInt(normalizedColor.substring(0, 2), 16);
    const g = parseInt(normalizedColor.substring(2, 4), 16);
    const b = parseInt(normalizedColor.substring(4, 6), 16);

    // Calculate relative luminance (perceived brightness)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Use white text for dark backgrounds, black text for light backgrounds
    return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Get appropriate text color for a node based on its background color
 * @param {Object} node - Node data object
 * @returns {string} Text color in hex format
 */
function getNodeTextColor(node) {
    const nodeColor = node.color || "#999";
    return getTextColor(nodeColor);
}

/**
 * Get appropriate text color for an edge based on its color
 * @param {Object} edge - Edge data object
 * @returns {string} Text color in hex format
 */
function getEdgeTextColor(edge) {
    const edgeColor = edge.color || "#999";
    return getTextColor(edgeColor);
}

/**
 * Export graph as PNG using Cytoscape's native export
 */
function exportGraphAsPNG() {
    // Check if we have a Cytoscape instance through the viz module
    if (window.SchGraphApp && window.SchGraphApp.viz && window.SchGraphApp.viz.exportAsPNG) {
        window.SchGraphApp.viz.exportAsPNG();
        return;
    }

    // Fallback if viz module export is not available
    const cy = window.SchGraphApp?.viz?.getCy?.();
    if (cy) {
        const blob = cy.png({
            output: 'blob',
            bg: '#f9f9f9',
            scale: 2 // Higher resolution
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        // Use custom filename if graph has a title
        if (window.SchGraphApp && window.SchGraphApp.state &&
            window.SchGraphApp.state.currentGraph &&
            window.SchGraphApp.state.currentGraph.title) {
            a.download = `${window.SchGraphApp.state.currentGraph.title.toLowerCase().replace(/\s+/g, '-')}.png`;
        } else {
            a.download = 'graph-visualization.png';
        }

        a.href = url;
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    } else {
        console.error('Cytoscape instance not found for export');
    }
}

// Make sure the functions are attached to the app namespace
document.addEventListener('DOMContentLoaded', function() {
    window.SchGraphApp = window.SchGraphApp || {};
    window.SchGraphApp.utils = window.SchGraphApp.utils || {};
    window.SchGraphApp.utils.formatNodeDetails = formatNodeDetails;
    window.SchGraphApp.utils.formatEdgeDetails = formatEdgeDetails;
    window.SchGraphApp.utils.exportGraphAsPNG = exportGraphAsPNG;
    window.SchGraphApp.utils.escapeHTML = escapeHTML;
    window.SchGraphApp.utils.getTextColor = getTextColor;
    window.SchGraphApp.utils.getNodeTextColor = getNodeTextColor;
    window.SchGraphApp.utils.getEdgeTextColor = getEdgeTextColor;
});