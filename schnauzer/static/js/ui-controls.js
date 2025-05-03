// ui-controls.js - UI controls and user interaction handling

/**
 * Initialize UI controls and event handlers
 * This module handles all UI-related interactions outside the graph itself
 */
function initializeUIControls() {
    const app = window.SchGraphApp;

    // Add export button
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

    // Set up search functionality if search box exists
    setupSearch();

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

    };
}

// Initialize UI controls when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.SchGraphApp) {
        window.SchGraphApp.ui = initializeUIControls();
    }
});