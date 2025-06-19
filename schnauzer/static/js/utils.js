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
 * Format any graph element (node or edge) for display in details panel
 * @param {Object} element - The element data object (node or edge)
 * @param {string} elementType - Either 'node' or 'edge'
 * @returns {string} HTML formatted element details
 */
function formatElementDetails(element, elementType = 'node') {
    if (!element) return `<p>No ${elementType} data available</p>`;

    let html = '';

    if (element.type) {
        html += `<p><strong>Type:</strong> ${escapeHTML(element.type) || 'Unknown'}</p>`;
    }

    // Special handling for edge source/target
    if (elementType === 'edge') {
        html += `<p><strong>Source:</strong> ${escapeHTML(element.source)}</p>`;
        html += `<p><strong>Target:</strong> ${escapeHTML(element.target)}</p>`;
    }

    // If there are labels, display them directly
    if (element.labels && typeof element.labels === 'object') {
        for (const [labelKey, labelValue] of Object.entries(element.labels)) {
            html += `<p><strong>${escapeHTML(labelKey)}:</strong> ${escapeHTML(labelValue)}</p>`;
        }
    }

    // Define special keys based on element type
    const baseSpecialKeys = ['id', 'name', 'type', 'color', 'x', 'y', 'description', 'labels'];
    const specialKeys = elementType === 'node'
        ? [...baseSpecialKeys, 'parents', 'children']
        : [...baseSpecialKeys, 'source', 'target'];

    // Show all other attributes
    for (const [key, value] of Object.entries(element)) {
        if (!specialKeys.includes(key) && value !== undefined && value !== null) {
            // Handle arrays and objects
            if (Array.isArray(value)) {
                html += `<p><strong>${escapeHTML(key)}:</strong> [${value.map(v => escapeHTML(String(v))).join(', ')}]</p>`;
            } else if (typeof value === 'object') {
                html += `<p><strong>${escapeHTML(key)}:</strong> ${escapeHTML(JSON.stringify(value))}</p>`;
            } else {
                html += `<p><strong>${escapeHTML(key)}:</strong> ${escapeHTML(value)}</p>`;
            }
        }
    }

    // Special handling for node parents/children
    if (elementType === 'node') {
        if (element.parents && Array.isArray(element.parents) && element.parents.length > 0) {
            html += `<p><strong>Parents:</strong><br>`;
            const parentNames = element.parents.map(p => {
                if (typeof p === 'object' && p.name) return p.name;
                if (typeof p === 'object' && p.id) return p.id;
                return String(p);
            });
            html += escapeHTML(parentNames.join(', '));
            html += `</p>`;
        }

        if (element.children && Array.isArray(element.children) && element.children.length > 0) {
            html += `<p><strong>Children:</strong><br>`;
            const childNames = element.children.map(c => {
                if (typeof c === 'object' && c.name) return c.name;
                if (typeof c === 'object' && c.id) return c.id;
                return String(c);
            });
            html += escapeHTML(childNames.join(', '));
            html += `</p>`;
        }
    }

    // Add description separately if available
    if (element.description && element.description.trim() !== '') {
        html += `
            <hr>
            <h6>Description</h6>
            <div class="node-description">${escapeHTML(element.description)}</div>
        `;
    }

    return html;
}

// Now create simple wrapper functions
function formatNodeDetails(node) {
    return formatElementDetails(node, 'node');
}

function formatEdgeDetails(edge) {
    return formatElementDetails(edge, 'edge');
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