// ui-controls.js - UI controls and user interaction handling for Cytoscape version

/**
 * Initialize UI controls and event handlers
 * This module handles all UI-related interactions outside the graph itself
 */
function initializeUIControls() {
    const app = window.SchGraphApp;

    // Add export button if not exists
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

    // Create force controls panel if not exists
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
    }

    // Set up search functionality
    setupSearch();

    // Set up force controls
    setupForceControls();

    // Show force controls by default since we start with 'cose' layout
    updateControlPanelVisibility('fcose');

    /**
     * Set up force control sliders
     */
    function setupForceControls() {
        const linkSlider = document.getElementById('link-slider');

        if (linkSlider) {
            linkSlider.addEventListener('input', debounce(() => {
                updateSliderValue('link-value', linkSlider.value);
                updateForceParameter('linkDistance', parseInt(linkSlider.value));
            }, 50));
        }
    }

    // Helper function to update slider value displays
    function updateSliderValue(spanId, value) {
        const span = document.getElementById(spanId);
        if (span) {
            span.textContent = value;
        }
    }

    /**
     * Update force parameters in the visualization
     */
    function updateForceParameter(type, value) {
        if (window.SchGraphApp && window.SchGraphApp.viz) {
            const forces = {};
            forces[type] = value;
            window.SchGraphApp.viz.updateForces(forces);
        }
    }

    /**
     * Set up search functionality for Cytoscape
     */
    function setupSearch() {
        const searchBox = document.getElementById('search-nodes');
        if (!searchBox) return;

        searchBox.addEventListener('input', debounce((event) => {
            const searchTerm = event.target.value.toLowerCase().trim();

            // Get the Cytoscape instance
            const cy = window.SchGraphApp.viz?.getCy?.();
            if (!cy) return;

            // Remove all search-related classes first
            cy.elements().removeClass('dimmed highlighted');

            // If no search term, just return (all elements visible)
            if (!searchTerm) {
                return;
            }

            // Add dimmed to ALL elements first
            cy.elements().addClass('dimmed');

            // Find matching nodes
            const matchingNodes = cy.nodes().filter(node => {
                const data = node.data();
                // Check both id and name fields (important for nodes like 'A', 'B', etc.)
                const nodeId = (data.id || '').toLowerCase();
                const nodeName = (data.name || '').toLowerCase();
                const nodeType = (data.type || '').toLowerCase();
                const nodeDesc = (data.description || '').toLowerCase();

                return nodeId.includes(searchTerm) ||
                       nodeName.includes(searchTerm) ||
                       nodeType.includes(searchTerm) ||
                       nodeDesc.includes(searchTerm);
            });

            // Remove dimmed and add highlighted to matching nodes
            matchingNodes.removeClass('dimmed').addClass('highlighted');

            // Also highlight edges between matching nodes
            matchingNodes.edgesWith(matchingNodes).removeClass('dimmed').addClass('highlighted');

        }, 200));

        // Clear search button
        const clearBtn = document.getElementById('clear-search');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchBox.value = '';
                // Trigger the input event to clear search
                searchBox.dispatchEvent(new Event('input'));
            });
        }
    }

    /**
     * Update control panel visibility based on layout type
     */
    function updateControlPanelVisibility(layoutName) {
        const forceControls = document.getElementById('force-controls');
        if (!forceControls) return;

        const forceLayouts = ['fcose', 'euler'];

        if (forceLayouts.includes(layoutName)) {
            forceControls.style.display = 'block';

            // Update labels based on layout type
            const chargeLabel = document.querySelector('label[for="charge-slider"]');
            const linkLabel = document.querySelector('label[for="link-slider"]');
            updateLayoutSpecificControls(layoutName);
        } else {
            forceControls.style.display = 'none';
        }
    }

    /**
     * Update control labels and values for specific layout types
     */
    function updateLayoutSpecificControls(layoutName) {
        const linkSlider = document.getElementById('link-slider');
        const linkLabel = document.querySelector('label[for="link-slider"]');

        if (linkSlider && linkLabel) {
            linkSlider.min = 50;
            linkSlider.max = 400;
            linkSlider.step = 10;
            linkSlider.value = 200;
            linkLabel.innerHTML = `Link Distance: <span id="link-value">200</span>`;
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
        updateControlPanelVisibility
    };
}

// Initialize UI controls when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.SchGraphApp) {
        window.SchGraphApp.ui = initializeUIControls();
    }
});