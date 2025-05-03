// ui-controls.js - UI controls and user interaction handling

/**
 * Initialize UI controls and event handlers
 * This module handles all UI-related interactions outside the graph itself
 */
function initializeUIControls() {
    const app = window.SchGraphApp;

    // Add optional export button if not already present
    if (!document.getElementById('export-graph')) {
        const exportBtn = document.createElement('button');
        exportBtn.id = 'export-graph';
        exportBtn.className = 'btn btn-sm btn-outline-secondary';
        exportBtn.innerHTML = '<i class="bi bi-download"></i> Export PNG';

        const btnGroup = document.querySelector('.graph-controls .btn-group');
        if (btnGroup) {
            btnGroup.appendChild(exportBtn);
        }
    }

    // Add event listeners to controls
    setupEventListeners();

    // Set up search functionality if search box exists
    setupSearch();

    /**
     * Set up event listeners for UI controls
     */
    function setupEventListeners() {
        // Export button
        const exportBtn = document.getElementById('export-graph');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                exportGraphAsPNG();
            });
        }

        // Close node details when clicking outside
        document.addEventListener('click', (event) => {
            // Only process if there's a selected node and click is outside node details
            if (app.state.selectedNode &&
                !event.target.closest('#node-details') &&
                !event.target.closest('.node')) {

                // Deselect node and hide details
                app.state.selectedNode = null;
                app.elements.nodeDetails.classList.add('d-none');
            }
        });

        // Handle window resize to adjust visualization size
        window.addEventListener('resize', debounce(() => {
            const svg = document.querySelector('#graph-container svg');
            if (svg) {
                svg.setAttribute('width', app.elements.graphContainer.clientWidth);
                svg.setAttribute('height', app.elements.graphContainer.clientHeight);
            }
        }, 250));
    }

    /**
     * Export the current graph visualization as a PNG image
     */
    function exportGraphAsPNG() {
        const svgElement = document.querySelector('#graph-container svg');
        if (!svgElement) return;

        // Get SVG data
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);

        // Create canvas
        const canvas = document.createElement('canvas');
        const graphContainer = document.getElementById('graph-container');
        canvas.width = graphContainer.clientWidth;
        canvas.height = graphContainer.clientHeight;

        const context = canvas.getContext('2d');
        context.fillStyle = '#f9f9f9'; // Match background color
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Create image
        const img = new Image();
        img.onload = () => {
            context.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);

            // Download the image
            const a = document.createElement('a');
            a.download = 'graph-visualization.png';
            if (app.state.currentGraph && app.state.currentGraph.title) {
                a.download = `${app.state.currentGraph.title.toLowerCase().replace(/\s+/g, '-')}.png`;
            }
            a.href = canvas.toDataURL('image/png');
            a.click();

            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
            }, 100);
        };
        img.src = url;
    }

    /**
     * Set up search functionality if search box exists
     */
    function setupSearch() {
        const searchBox = document.getElementById('search-nodes');
        if (!searchBox) return;

        searchBox.addEventListener('input', debounce((event) => {
            const searchTerm = event.target.value.toLowerCase().trim();

            // If no search term, show all nodes
            if (!searchTerm) {
                d3.selectAll('.node').style('opacity', 1);
                d3.selectAll('.link').style('opacity', 0.6);
                return;
            }

            // Find matching nodes
            const matchingNodes = new Set();

            d3.selectAll('.node').each(function(d) {
                const nodeData = d;
                const nodeLabel = (nodeData.label || nodeData.id || '').toLowerCase();
                const nodeMatch = nodeLabel.includes(searchTerm) ||
                                 (nodeData.type || '').toLowerCase().includes(searchTerm) ||
                                 (nodeData.category || '').toLowerCase().includes(searchTerm);

                if (nodeMatch) {
                    matchingNodes.add(nodeData.id);
                    d3.select(this).style('opacity', 1);
                } else {
                    d3.select(this).style('opacity', 0.2);
                }
            });

            // Highlight links connected to matching nodes
            d3.selectAll('.link').style('opacity', function(d) {
                if (matchingNodes.has(d.source.id) && matchingNodes.has(d.target.id)) {
                    return 0.8;
                } else {
                    return 0.1;
                }
            });
        }, 200));

        // Clear search button
        const clearBtn = document.getElementById('clear-search');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchBox.value = '';
                searchBox.dispatchEvent(new Event('input'));
            });
        }
    }

    /**
     * Debounce function to limit rapid firing of an event
     */
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Return public API
    return {
        exportGraphAsPNG
    };
}

// Initialize UI controls when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.SchGraphApp) {
        window.SchGraphApp.ui = initializeUIControls();
    }
});