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
                <div class="mb-3" id="spring-length-control">
                    <label for="spring-length-slider" class="form-label">Spring Length: <span id="spring-length-value">200</span></label>
                    <input type="range" class="form-range" id="spring-length-slider" min="50" max="400" step="10" value="200">
                </div>
                <div class="mb-3" id="spring-strength-control" style="display: none;">
                    <label for="spring-strength-slider" class="form-label">Spring Strength: <span id="spring-strength-value">0.0001</span></label>
                    <input type="range" class="form-range" id="spring-strength-slider" min="0.00001" max="0.001" step="0.00001" value="0.0001">
                </div>
                <div class="mb-3" id="mass-control" style="display: none;">
                    <label for="mass-slider" class="form-label">Node Mass: <span id="mass-value">4</span></label>
                    <input type="range" class="form-range" id="mass-slider" min="1" max="20" step="1" value="4">
                </div>
                <div class="mb-3" id="gravity-control" style="display: none;">
                    <label for="gravity-slider" class="form-label">Gravity: <span id="gravity-value">-0.8</span></label>
                    <input type="range" class="form-range" id="gravity-slider" min="-5" max="5" step="0.1" value="-0.8">
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
        // Spring length slider
        const springLengthSlider = document.getElementById('spring-length-slider');
        if (springLengthSlider) {
            springLengthSlider.addEventListener('input', debounce(() => {
                updateSliderValue('spring-length-value', springLengthSlider.value);
                updateForceParameter('springLength', parseInt(springLengthSlider.value));
            }, 50));
        }

        // Spring strength slider
        const springStrengthSlider = document.getElementById('spring-strength-slider');
        if (springStrengthSlider) {
            springStrengthSlider.addEventListener('input', debounce(() => {
                const value = parseFloat(springStrengthSlider.value);
                updateSliderValue('spring-strength-value', value.toFixed(5));
                updateForceParameter('springCoeff', value);
            }, 50));
        }

        // Mass slider
        const massSlider = document.getElementById('mass-slider');
        if (massSlider) {
            massSlider.addEventListener('input', debounce(() => {
                updateSliderValue('mass-value', massSlider.value);
                updateForceParameter('mass', parseInt(massSlider.value));
            }, 50));
        }

        // Gravity slider
        const gravitySlider = document.getElementById('gravity-slider');
        if (gravitySlider) {
            gravitySlider.addEventListener('input', debounce(() => {
                const value = parseFloat(gravitySlider.value);
                updateSliderValue('gravity-value', value.toFixed(1));
                updateForceParameter('gravity', value);
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

        const forceLayouts = ['fcose'];

        if (forceLayouts.includes(layoutName)) {
            forceControls.style.display = 'block';
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