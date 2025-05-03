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
        exportBtn.innerHTML = '<i class="bi bi-download"></i> Export';

        const btnGroup = document.querySelector('.graph-controls .btn-group');
        if (btnGroup) {
            btnGroup.appendChild(exportBtn);
        }
    }

    // Add event listeners to controls
    setupEventListeners();

    // Add additional keyboard shortcuts
    setupKeyboardShortcuts();

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
                const graphData = app.state.currentGraph;
                const title = graphData.title || 'graph';
                const filename = `${title.toLowerCase().replace(/\s+/g, '-')}.json`;
                app.utils.downloadGraphJSON(graphData, filename);
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
     * Set up keyboard shortcuts
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Only process if not typing in an input field
            if (event.target.tagName === 'INPUT' ||
                event.target.tagName === 'TEXTAREA' ||
                event.target.isContentEditable) {
                return;
            }

            switch (event.key) {
                case 'r': // Reset zoom
                    if (app.viz && app.viz.resetZoom) {
                        app.viz.resetZoom();
                    }
                    break;

                case 'f': // Toggle physics
                    if (app.viz && app.viz.togglePhysics) {
                        app.state.physicsEnabled = !app.state.physicsEnabled;
                        const toggleBtn = app.elements.togglePhysicsBtn;
                        if (toggleBtn) {
                            toggleBtn.textContent = app.state.physicsEnabled ?
                                'Freeze Nodes' : 'Enable Physics';
                        }
                        app.viz.togglePhysics(app.state.physicsEnabled);
                    }
                    break;

                case 'Escape': // Close node details
                    if (app.state.selectedNode) {
                        app.state.selectedNode = null;
                        app.elements.nodeDetails.classList.add('d-none');
                    }
                    break;
            }
        });
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
        // Add any methods that need to be accessed outside
    };
}

// Initialize UI controls when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.SchGraphApp) {
        window.SchGraphApp.ui = initializeUIControls();
    }
});