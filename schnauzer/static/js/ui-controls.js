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

    if (!document.getElementById('force-controls')) {
        const controlsPanel = document.createElement('div');
        controlsPanel.id = 'force-controls';
        controlsPanel.className = 'card mb-4';
        controlsPanel.innerHTML = `
            <div class="card-header">
                <h5 class="mb-0">Layout Controls</h5>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label for="charge-slider" class="form-label">Repulsion Force: <span id="charge-value">-1800</span></label>
                    <input type="range" class="form-range" id="charge-slider" min="-3000" max="-500" step="100" value="-1800">
                </div>
                <div class="mb-3">
                    <label for="link-slider" class="form-label">Link Distance: <span id="link-value">200</span></label>
                    <input type="range" class="form-range" id="link-slider" min="50" max="400" step="10" value="200">
                </div>
                <div class="mb-3">
                    <label for="collision-slider" class="form-label">Collision Strength: <span id="collision-value">1.0</span></label>
                    <input type="range" class="form-range" id="collision-slider" min="0.1" max="1.5" step="0.1" value="1.0">
                </div>
            </div>
        `;

        // Add it after the graph information panel
        const graphInfoPanel = document.querySelector('.graph-stats').closest('.card');
        if (graphInfoPanel && graphInfoPanel.parentNode) {
            graphInfoPanel.parentNode.insertBefore(controlsPanel, graphInfoPanel.nextSibling);
        } else {
            // Fallback insertion location
            const container = document.querySelector('.col-md-3');
            if (container) {
                container.appendChild(controlsPanel);
            }
        }
        setupForceControls()
    }

    // Set up search functionality if search box exists
    setupSearch();



    function setupForceControls() {
        const chargeSlider = document.getElementById('charge-slider');
        const linkSlider = document.getElementById('link-slider');
        const collisionSlider = document.getElementById('collision-slider');
        const chargeValue = document.getElementById('charge-value');
        const linkValue = document.getElementById('link-value');
        const collisionValue = document.getElementById('collision-value');

        // Update forces immediately when sliders change
        chargeSlider.addEventListener('input', () => {
            chargeValue.textContent = chargeSlider.value;
            updateForceParameter('charge', parseInt(chargeSlider.value));
        });

        linkSlider.addEventListener('input', () => {
            linkValue.textContent = linkSlider.value;
            updateForceParameter('linkDistance', parseInt(linkSlider.value));
        });

        collisionSlider.addEventListener('input', () => {
            collisionValue.textContent = collisionSlider.value;
            updateForceParameter('collisionStrength', parseFloat(collisionSlider.value));
        });
    }

    function updateForceParameter(type, value) {
    if (window.SchGraphApp && window.SchGraphApp.viz) {
        const forces = {};
        forces[type] = value;
        window.SchGraphApp.viz.updateForces(forces);
    }
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
                const nodeLabel = (nodeData.name || '').toLowerCase();
                const nodeMatch = nodeLabel.includes(searchTerm) ||
                                 (nodeData.type || '').toLowerCase().includes(searchTerm) ||
                                 (nodeData.category || '').toLowerCase().includes(searchTerm);

                if (nodeMatch) {
                    matchingNodes.add(nodeData.name);
                    d3.select(this).style('opacity', 1);
                } else {
                    d3.select(this).style('opacity', 0.2);
                }
            });

            // Highlight links connected to matching nodes
            d3.selectAll('.link').style('opacity', function(d) {
                if (matchingNodes.has(d.source.name) && matchingNodes.has(d.target.name)) {
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