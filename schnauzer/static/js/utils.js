// utils.js - Utility functions for the graph visualization


/**
 * Format node data for display in details panel
 * @param {Object} node - The node data object
 * @returns {string} HTML formatted node details
 */
function formatNodeDetails(node) {
    if (!node) return '';

    let html = '';

    // Show node name at the top
    html += `<p><strong>Name:</strong> ${node.name || 'Unknown'}</p>`;

    // Show all labels from the dictionary
    if (node.labels && Object.keys(node.labels).length > 0) {
        html += `<h6>Labels</h6>`;

        for (const [key, value] of Object.entries(node.labels)) {
            html += `<p><strong>${key}:</strong> ${value}</p>`;
        }
    }

    // Get the current graph data
    const graph = window.SchGraphApp.state.currentGraph;
    if (!graph || !graph.edges) return html;

    // Find parents and children from links
    const parents = [];
    const children = [];

    // Process all links to find relationships
    graph.edges.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.name : link.source;
        const targetId = typeof link.target === 'object' ? link.target.name : link.target;

        // If this node is the target, the source is a parent
        if (targetId === node.name) {
            const parentNode = graph.nodes.find(n => n.name === sourceId);
            if (parentNode) {
                parents.push(parentNode);
            }
        }

        // If this node is the source, the target is a child
        if (sourceId === node.name) {
            const childNode = graph.nodes.find(n => n.name === targetId);
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
            const parentNames = parents.map(p => p.name).join(', ');
            html += parentNames;
        } else {
            html += 'None';
        }
        html += `</p>`;

        // Show children
        html += `<p><strong>Children:</strong> `;
        if (children.length > 0) {
            const childrenNames = children.map(c => c.name).join(', ');
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


function formatEdgeDetails(edge) {
    if (!edge) return '';

    let html = '';

    // Show edge name at the top if available
    if (edge.name) {
        html += `<p><strong>Name:</strong> ${edge.name}</p>`;
    }

    // Show source and target
    const sourceNode = typeof edge.source === 'object' ? edge.source :
        (window.SchGraphApp.state.currentGraph?.nodes.find(n => n.name === edge.source) || {name: edge.source});
    const targetNode = typeof edge.target === 'object' ? edge.target :
        (window.SchGraphApp.state.currentGraph?.nodes.find(n => n.name === edge.target) || {name: edge.target});

    html += `<p><strong>From:</strong> ${sourceNode.name}</p>`;
    html += `<p><strong>To:</strong> ${targetNode.name}</p>`;

    // Show all labels from the dictionary
    if (edge.labels && Object.keys(edge.labels).length > 0) {
        html += `<h6>Labels</h6>`;

        for (const [key, value] of Object.entries(edge.labels)) {
            html += `<p><strong>${key}:</strong> ${value}</p>`;
        }
    }

    // Add description if available
    if (edge.description) {
        html += `
            <hr>
            <h6>Description</h6>
            <div class="node-description">${edge.description.replace(/\n/g, '<br>')}</div>
        `;
    }

    return html;
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

    // Set cross-origin = anonymous to avoid tainted canvas issues
    img.crossOrigin = 'Anonymous';
    img.src = url;

    // Add error handling
    img.onerror = (error) => {
        console.error('Error creating export:', error);
        URL.revokeObjectURL(url);
    };
}

// Make sure the function is attached to the app namespace
document.addEventListener('DOMContentLoaded', function() {
    window.SchGraphApp = window.SchGraphApp || {};
    window.SchGraphApp.utils = window.SchGraphApp.utils || {};
    window.SchGraphApp.utils.formatNodeDetails = formatNodeDetails;
    window.SchGraphApp.utils.formatEdgeDetails = formatEdgeDetails;
    window.SchGraphApp.utils.exportGraphAsPNG = exportGraphAsPNG;
});