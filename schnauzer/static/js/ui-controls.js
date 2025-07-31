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

    // Set up search functionality
    setupSearch();

    // Set up trace functionality
    initializeTrace();

    // Reinitialize trace when graph updates
    window.addEventListener('graphUpdated', () => {
        setupSearch()
        initializeTrace();
    });

    // Set up force controls
    setupForceControls();

    // Show force controls by default since we start with 'cose' layout
    updateControlPanelVisibility('fcose');

    /**
     * Set up force control sliders
     */
    function setupForceControls() {
        // Only spring length slider now
        const springLengthSlider = document.getElementById('spring-length-slider');
        const springLengthValue = document.getElementById('spring-length-value');

        if (springLengthSlider && springLengthValue) {
            // Initialize Bootstrap tooltip
            new bootstrap.Tooltip(springLengthSlider);

            springLengthSlider.addEventListener('input', debounce(() => {
                springLengthValue.textContent = springLengthSlider.value;
                updateForceParameter('springLength', parseInt(springLengthSlider.value));
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

            // Parse search term for filters (format: "attribute:value")
            const filters = [];
            let generalSearchTerms = [];

            // Split search into potential filters and general search terms
            searchTerm.split(/\s+/).forEach(term => {
                if (term.includes(':') && term.split(':').length === 2) {
                    const [attr, value] = term.split(':');
                    if (attr && value) {
                        filters.push({ attribute: attr.toLowerCase(), value: value.toLowerCase() });
                    }
                } else if (term) {
                    generalSearchTerms.push(term);
                }
            });

            const generalSearch = generalSearchTerms.join(' ');

            // Debug logging
            console.log(`Search term: "${searchTerm}", Filters:`, filters, `General search: "${generalSearch}"`);

            // Helper function to check if an element matches the search criteria
            function elementMatches(data) {
                // Check filters first
                for (const filter of filters) {
                    const attrValue = String(data[filter.attribute] || '').toLowerCase();
                    if (!attrValue.includes(filter.value)) {
                        return false; // If any filter doesn't match, exclude this element
                    }
                }

                // If we only have filters and they all passed, include the element
                if (filters.length > 0 && !generalSearch) {
                    return true;
                }

                // For general search, check all attributes
                if (generalSearch) {
                    // Convert all data attributes to searchable text
                    const searchableText = Object.entries(data)
                        .map(([key, value]) => {
                            // Handle different value types
                            if (Array.isArray(value)) {
                                return value.join(' ');
                            } else if (typeof value === 'object' && value !== null) {
                                return JSON.stringify(value);
                            }
                            return String(value || '');
                        })
                        .join(' ')
                        .toLowerCase();

                    // Debug: log what we're searching in
                    if (data.description && data.description.toLowerCase().includes('have')) {
                        console.log('Found "have" in:', data, 'searchableText:', searchableText);
                    }

                    return searchableText.includes(generalSearch);
                }

                return false;
            }

            // Add dimmed to ALL elements first
            cy.elements().addClass('dimmed');

            // Find matching nodes
            const matchingNodes = cy.nodes().filter(node => elementMatches(node.data()));
            console.log(`Matching nodes:`, matchingNodes.length);

            // Find matching edges
            const matchingEdges = cy.edges().filter(edge => elementMatches(edge.data()));
            console.log(`Matching edges:`, matchingEdges.length);

            // Log which edges are matching
            matchingEdges.forEach(edge => {
                console.log(`Matching edge:`, edge.data());
            });

            // Remove dimmed and add highlighted to matching elements
            matchingNodes.removeClass('dimmed').addClass('highlighted');
            matchingEdges.removeClass('dimmed').addClass('highlighted');

            // Also highlight edges connected to matching nodes
            matchingNodes.connectedEdges().removeClass('dimmed').addClass('highlighted');

            // Also highlight nodes connected to matching edges
            matchingEdges.connectedNodes().removeClass('dimmed').addClass('highlighted');

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

    const traceState = {
        attribute: null,
        traceColor: '#e74c3c',
        showOrigins: false,
        currentPathIndex: 0,
        currentPaths: []
    };

    // Define the handler separately to avoid duplicate listeners
    function handleOriginsChange() {
        const originsCheckbox = document.getElementById('show-origins');
        traceState.showOrigins = originsCheckbox.checked;
        traceState.currentPathIndex = 0;
        traceState.currentPaths = [];
        clearTraceHighlights();
    }

    /**
     * Initialize trace functionality
     */
    function initializeTrace() {
        const cy = window.SchGraphApp.viz?.getCy?.();
        if (!cy) return;

        // Discover and populate attributes
        const attributes = new Set();

        // Get attributes from all nodes
        cy.nodes().forEach(node => {
            Object.keys(node.data()).forEach(key => {
                if (key !== 'id' && key !== 'name') {
                    attributes.add(key);
                }
            });
        });

        // Get attributes from all edges
        cy.edges().forEach(edge => {
            Object.keys(edge.data()).forEach(key => {
                if (key !== 'id' && key !== 'source' && key !== 'target') {
                    attributes.add(key);
                }
            });
        });

        // Populate dropdown
        const select = document.getElementById('trace-attribute');
        select.innerHTML = '<option value="">No trace</option>';

        Array.from(attributes).sort().forEach(attr => {
            const option = document.createElement('option');
            option.value = attr;
            option.textContent = attr;
            select.appendChild(option);
        });

        // Handle attribute selection
        select.addEventListener('change', () => {
            traceState.attribute = select.value || null;
            clearTraceHighlights();
        });

        // Show/hide origins checkbox based on traces availability
        const originsContainer = document.getElementById('show-origins-container');
        const originsCheckbox = document.getElementById('show-origins');

        if (window.SchGraphApp.state.traces) {
            originsContainer.classList.remove('d-none');

            // Remove old listener if it exists
            originsCheckbox.removeEventListener('change', handleOriginsChange);
            // Add new listener
            originsCheckbox.addEventListener('change', handleOriginsChange);
        } else {
            originsContainer.classList.add('d-none');
            traceState.showOrigins = false;
            originsCheckbox.checked = false;
        }
    }

    /**
     * Perform trace for clicked element
     */
    function performTrace(element) {
        const cy = window.SchGraphApp.viz?.getCy?.();
        if (!cy) return;

        // Clear previous highlights
        clearTraceHighlights();
        traceState.currentPaths = [];
        traceState.currentPathIndex = 0;

        if (traceState.showOrigins && element.isEdge()) {
            // Origins mode - trace message paths
            const msgId = element.data('msg_id');
            console.log('Tracing origins for edge with msg_id:', msgId);

            if (msgId === undefined || msgId === null) {
                console.log('Edge has no msg_id attribute');
                return;
            }

            if (!window.SchGraphApp.state.traces) {
                console.log('No traces data available');
                return;
            }

            const paths = window.SchGraphApp.state.traces[String(msgId)];
            if (!paths || paths.length === 0) {
                console.log(`No paths found for msg_id ${msgId}`);
                return;
            }

            traceState.currentPaths = paths;
            highlightPaths(paths);

            // Update edge details to show path navigation if this edge is selected
            if (window.SchGraphApp.state.selectedEdge === element.data('id')) {
                updateEdgeDetailsWithPaths();
            }
        } else if (traceState.attribute) {
            // Normal attribute tracing
            const clickedData = element.data();
            const traceValue = clickedData[traceState.attribute];

            if (traceValue === undefined || traceValue === null || traceValue === '') {
                console.log(`No value for attribute "${traceState.attribute}" in clicked element`);
                return;
            }

            // Check for empty arrays/objects
            if ((Array.isArray(traceValue) && traceValue.length === 0) ||
                (typeof traceValue === 'string' && traceValue.trim() === '')) {
                console.log(`Empty value for attribute "${traceState.attribute}" in clicked element`);
                return;
            }

            // Convert trace value to string for contains check
            const traceValueStr = String(traceValue)
                    .toLowerCase()
                    .replace(/[^a-zA-Z0-9\s\-_]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

            if (traceValueStr === '') {
                return;
            }

            // Find all elements with matching value
            const matchingElements = cy.elements().filter(el => {
                const elValue = el.data()[traceState.attribute];

                if (elValue === undefined || elValue === null) {
                    return false;
                }

                const elValueStr = String(elValue)
                    .toLowerCase()
                    .replace(/[^a-zA-Z0-9\s\-_]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                return elValueStr.includes(traceValueStr);
            });

            // Apply highlight
            matchingElements.addClass('trace-highlight');

            console.log(`Tracing ${traceState.attribute}="${traceValue}": found ${matchingElements.length} matches`);
        }
    }

    /**
     * Highlight paths with primary and secondary styling
     */
    function highlightPaths(paths) {
        const cy = window.SchGraphApp.viz?.getCy?.();
        if (!cy) return;

        // Clear any existing secondary highlights
        cy.edges().removeClass('trace-highlight-secondary');

        paths.forEach((path, pathIndex) => {
            // Highlight all edges in this path
            path.forEach(msgId => {
                // Find edges with this msg_id
                cy.edges().forEach(edge => {
                    const edgeMsgId = edge.data('msg_id');
                    if (edgeMsgId !== undefined && edgeMsgId !== null && edgeMsgId == msgId) {
                        if (pathIndex === traceState.currentPathIndex) {
                            edge.addClass('trace-highlight');
                        } else {
                            edge.addClass('trace-highlight-secondary');
                        }
                    }
                });
            });
        });

        console.log(`Highlighted ${paths.length} paths for message origins`);
    }

    /**
     * Update edge details panel with path navigation
     */
    function updateEdgeDetailsWithPaths() {
        const detailsContent = document.getElementById('node-details-content');
        if (!detailsContent || traceState.currentPaths.length === 0) return;

        // Add path navigation at the top of details
        const pathNavHTML = `
            <div class="path-navigation mb-3 p-2 bg-light rounded">
                <div class="d-flex justify-content-between align-items-center">
                    <span>Path ${traceState.currentPathIndex + 1} of ${traceState.currentPaths.length}</span>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary" onclick="window.navigatePath(-1)" 
                                ${traceState.currentPathIndex === 0 ? 'disabled' : ''}>
                            <i class="bi bi-chevron-left"></i>
                        </button>
                        <button class="btn btn-outline-secondary" onclick="window.navigatePath(1)"
                                ${traceState.currentPathIndex === traceState.currentPaths.length - 1 ? 'disabled' : ''}>
                            <i class="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>
                <small class="text-muted d-block mt-1">
                    Message IDs: ${traceState.currentPaths[traceState.currentPathIndex].join(' → ')}
                </small>
            </div>
        `;

        // Prepend navigation to existing content
        const existingContent = detailsContent.innerHTML;
        detailsContent.innerHTML = pathNavHTML + existingContent;
    }

    /**
     * Navigate between paths
     */
    window.navigatePath = function(direction) {
        traceState.currentPathIndex += direction;
        traceState.currentPathIndex = Math.max(0, Math.min(traceState.currentPathIndex, traceState.currentPaths.length - 1));

        // Re-highlight with new primary path
        clearTraceHighlights();
        highlightPaths(traceState.currentPaths);

        // Update the navigation UI
        updateEdgeDetailsWithPaths();
    };

    /**
     * Clear all trace highlights
     */
    function clearTraceHighlights() {
        const cy = window.SchGraphApp.viz?.getCy?.();
        if (!cy) return;

        cy.elements().removeClass('trace-highlight trace-highlight-secondary');
    }

    /**
     * Update control panel visibility based on layout type
     */
    function updateControlPanelVisibility(layoutName) {
        const springControl = document.getElementById('spring-length-control');
        if (!springControl) return;

        const forceLayouts = ['fcose'];

        if (forceLayouts.includes(layoutName)) {
            springControl.classList.remove('d-none');
        } else {
            springControl.classList.add('d-none');
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

    window.traceState = traceState;
    window.performTrace = performTrace;

    window.addEventListener('graphUpdated', () => {
        initializeTrace();
    });

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