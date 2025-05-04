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

    let html = '';

    // Show node name at the top
    html += `<p><strong>Name:</strong> ${node.name || node.id || 'Unknown'}</p>`;

    // Show all labels from the dictionary
    if (node.labels && Object.keys(node.labels).length > 0) {
        html += `<h6>Properties</h6>`;

        for (const [key, value] of Object.entries(node.labels)) {
            html += `<p><strong>${key}:</strong> ${value}</p>`;
        }
    }

    // Get the current graph data
    const graph = window.SchGraphApp.state.currentGraph;
    if (!graph || !graph.links) return html;

    // Find parents and children from links
    const parents = [];
    const children = [];

    // Process all links to find relationships
    graph.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;

        // If this node is the target, the source is a parent
        if (targetId === node.id) {
            const parentNode = graph.nodes.find(n => n.id === sourceId);
            if (parentNode) {
                parents.push(parentNode);
            }
        }

        // If this node is the source, the target is a child
        if (sourceId === node.id) {
            const childNode = graph.nodes.find(n => n.id === targetId);
            if (childNode) {
                children.push(childNode);
            }
        }
    });

    // Show relationships section if there are any
    if (parents.length > 0 || children.length > 0) {
        html += `<h6>Relationships</h6>`;

        // Show parents
        html += `<p><strong>Parents:</strong> `;
        if (parents.length > 0) {
            const parentNames = parents.map(p => p.name || p.id).join(', ');
            html += parentNames;
        } else {
            html += 'None';
        }
        html += `</p>`;

        // Show children
        html += `<p><strong>Children:</strong> `;
        if (children.length > 0) {
            const childrenNames = children.map(c => c.name || c.id).join(', ');
            html += childrenNames;
        } else {
            html += 'None';
        }
        html += `</p>`;
    }

    // Add description if available
    if (node.description) {
        html += `
            <hr>
            <h6>Description</h6>
            <div class="node-description">${node.description.replace(/\n/g, '<br>')}</div>
        `;
    }

    return html;
}
// Helper functions

function isComplexValue(value) {
    return (typeof value === 'object' && value !== null) ||
           (typeof value === 'string' && value.length > 100);
}

function formatValue(value) {
    if (value === null || value === undefined) {
        return '<em>None</em>';
    } else if (typeof value === 'boolean') {
        return value ? 'True' : 'False';
    } else if (typeof value === 'number') {
        // Format address-like numbers as hex
        if (value > 1000000) {
            return '0x' + value.toString(16);
        }
        return value.toString();
    } else {
        // Basic string escaping
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}

function formatComplexValue(value) {
    if (typeof value === 'object' && value !== null) {
        try {
            // Pretty print JSON with syntax highlighting
            const json = JSON.stringify(value, null, 2);

            // Simple syntax highlighting
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                let cls = 'text-primary'; // string
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'text-dark'; // key
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'text-success'; // boolean
                } else if (/null/.test(match)) {
                    cls = 'text-danger'; // null
                } else {
                    cls = 'text-info'; // number
                }
                return '<span class="' + cls + '">' + match + '</span>';
            }).replace(/\n/g, '<br>').replace(/\s{2}/g, '&nbsp;&nbsp;');
        } catch (e) {
            // Fallback for objects that can't be stringified
            return `<span class="text-danger">Complex object: ${e.message}</span>`;
        }
    } else if (typeof value === 'string') {
        // For long strings
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    } else {
        return formatValue(value);
    }
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

function exportGraphAsPNG() {
    const svgElement = document.querySelector('#graph-container svg');
    if (!svgElement) {
        console.error('SVG element not found');
        return;
    }

    // Create a copy of the SVG to avoid modifying the original
    const svgClone = svgElement.cloneNode(true);

    // Make sure all SVG elements have explicit styling
    // This ensures that CSS styles are included in the exported image
    const lines = svgClone.querySelectorAll('.link');
    lines.forEach(line => {
        // Explicitly set stroke attributes that might be in CSS
        if (!line.getAttribute('stroke')) {
            line.setAttribute('stroke', '#999');
        }
        if (!line.getAttribute('stroke-width')) {
            line.setAttribute('stroke-width', '2');
        }
        if (!line.getAttribute('stroke-opacity')) {
            line.setAttribute('stroke-opacity', '0.6');
        }
    });

    // Set explicit dimensions on the SVG
    const width = svgElement.clientWidth || svgElement.parentElement.clientWidth;
    const height = svgElement.clientHeight || svgElement.parentElement.clientHeight;
    svgClone.setAttribute('width', width);
    svgClone.setAttribute('height', height);

    // You might need to include namespaces for proper rendering
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    // Get SVG data with proper encoding
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);

    // Create canvas with appropriate dimensions
    const canvas = document.createElement('canvas');
    // Use a slightly higher resolution for better quality
    const scale = 2; // 2x scaling for better resolution
    canvas.width = width * scale;
    canvas.height = height * scale;

    const context = canvas.getContext('2d');
    context.fillStyle = '#f9f9f9'; // Match background color
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(scale, scale); // Scale up for better resolution

    // Create image and draw to canvas
    const img = new Image();
    img.onload = () => {
        // Draw the image
        context.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        // Download the image
        const a = document.createElement('a');
        a.download = 'graph-visualization.png';

        // Use custom filename if graph has a title
        if (window.SchGraphApp && window.SchGraphApp.state &&
            window.SchGraphApp.state.currentGraph &&
            window.SchGraphApp.state.currentGraph.title) {
            a.download = `${window.SchGraphApp.state.currentGraph.title.toLowerCase().replace(/\s+/g, '-')}.png`;
        }

        a.href = canvas.toDataURL('image/png');
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
        }, 100);
    };

    // Set crossorigin to anonymous to avoid tainted canvas issues
    img.crossOrigin = 'Anonymous';
    img.src = url;

    // Add error handling
    img.onerror = (error) => {
        console.error('Error creating export:', error);
        URL.revokeObjectURL(url);
    };
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

// Make sure the function is attached to the app namespace
document.addEventListener('DOMContentLoaded', function() {
    window.SchGraphApp = window.SchGraphApp || {};
    window.SchGraphApp.utils = window.SchGraphApp.utils || {};
    window.SchGraphApp.utils.exportGraphAsPNG = exportGraphAsPNG;
});