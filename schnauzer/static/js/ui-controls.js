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


    // Trace state management (simplified)
    const traceState = {
        attribute: null,
        traceColor: '#e74c3c' // Single red color for tracing
    };

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
    }

    /**
     * Perform trace for clicked element
     */
    function performTrace(element) {
        if (!traceState.attribute) return;

        const cy = window.SchGraphApp.viz?.getCy?.();
        if (!cy) return;

        const clickedData = element.data();
        const traceValue = clickedData[traceState.attribute];

        if (traceValue === undefined || traceValue === null) {
            console.log(`No value for attribute "${traceState.attribute}" in clicked element`);
            return;
        }

        // Clear previous highlights
        clearTraceHighlights();

        // Convert trace value to string for contains check
        const traceValueStr = String(traceValue)
                .toLowerCase()
                .replace(/[^a-zA-Z0-9\s\-_]/g, ' ')  // Replace special chars with spaces
                .replace(/\s+/g, ' ')                 // Collapse multiple spaces
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

            // Convert to string and check if it contains the trace value
            const elValueStr = String(elValue)
                .toLowerCase()
                .replace(/[^a-zA-Z0-9\s\-_]/g, ' ')  // Replace special chars with spaces
                .replace(/\s+/g, ' ')                 // Collapse multiple spaces
                .trim();
            return elValueStr.includes(traceValueStr);
        });

        // Apply highlight
        matchingElements.addClass('trace-highlight');

        console.log(`Tracing ${traceState.attribute}="${traceValue}": found ${matchingElements.length} matches`);
    }

    /**
     * Clear all trace highlights
     */
    function clearTraceHighlights() {
        const cy = window.SchGraphApp.viz?.getCy?.();
        if (!cy) return;

        cy.elements().removeClass('trace-highlight');
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