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
        initializeAttributeFilter()
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


    function setupUnconstrainedRunFilter() {
        const checkbox = document.getElementById('hide-unconstrained-run');
        const container = document.getElementById('hide-unconstrained-container');

        if (!checkbox || !container) return;

        // Always show the checkbox container
        container.classList.remove('d-none');

        console.log("Is this run?")
        // Hide unconstrained edges by default
        const cy = window.SchGraphApp.viz?.getCy?.();
        if (cy) {
            let unconstrainedCount = 0;
            cy.edges().forEach(edge => {
                if (edge.data('from_unconstrained_run') === true) {
                    edge.addClass('hidden-unconstrained');
                    unconstrainedCount++;
                }
            });
            console.log(`Initially hid ${unconstrainedCount} unconstrained edges out of ${cy.edges().length} total edges`);
        }


        // Set up the event handler
        checkbox.addEventListener('change', function() {
            const cy = window.SchGraphApp.viz?.getCy?.();
            if (!cy) {
                console.log('Cytoscape instance not found');
                return;
            }

            if (this.checked) {
                // Show all edges
                cy.edges().removeClass('hidden-unconstrained');
                console.log('Showing all edges');
            } else {
                // Hide edges from unconstrained runs
                let hiddenCount = 0;
                cy.edges().forEach(edge => {
                    if (edge.data('from_unconstrained_run') === true) {
                        edge.addClass('hidden-unconstrained');
                        hiddenCount++;
                    }
                });
                console.log(`Hid ${hiddenCount} unconstrained edges`);
            }
        });
    }

    // Store filter state at module level
    let filterState = {
        hiddenAttribute: null,
        initialized: false
    };

    /**
     * Initialize attribute filter functionality
     */
    function initializeAttributeFilter() {
        const cy = window.SchGraphApp.viz?.getCy?.();
        if (!cy) {
            console.log('No cytoscape instance available for filter initialization');
            return;
        }

        // Discover all attributes in the graph
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

        console.log(`Found ${attributes.size} filterable attributes:`, Array.from(attributes));

        // Populate dropdown
        const select = document.getElementById('filter-attribute');
        if (!select) {
            console.log('Filter dropdown not found');
            return;
        }

        select.innerHTML = '<option value="">Show all</option>';

        Array.from(attributes).sort().forEach(attr => {
            const option = document.createElement('option');
            option.value = attr;
            option.textContent = `Hide: ${attr}`;
            select.appendChild(option);
        });

        // Only set up listener once
        if (!filterState.initialized) {
            select.addEventListener('change', () => {
                filterState.hiddenAttribute = select.value || null;
                applyFilters();
            });
            filterState.initialized = true;
        }

        // Re-apply existing filter to the new graph
        applyFilters();
    }

    function applyFilters() {
        const cy = window.SchGraphApp.viz?.getCy?.();
        if (!cy) return;

        // First show all elements
        cy.elements().style('display', 'element');

        if (!filterState.hiddenAttribute) return;

        // Hide elements that have the selected attribute
        cy.elements().forEach(el => {
            if (el.data(filterState.hiddenAttribute) !== undefined) {
                el.style('display', 'none');
            }
        });
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
            highlightPaths(traceState.currentPaths, element);

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
    function highlightPaths(paths, clickedEdge) {
        const cy = window.SchGraphApp.viz?.getCy?.();
        if (!cy) return;

        // Clear any existing highlights
        cy.edges().removeClass('trace-highlight trace-highlight-secondary');

        // If no clicked edge provided, try to get the selected one
        if (!clickedEdge && window.SchGraphApp.state.selectedEdge) {
            clickedEdge = cy.edges().filter(edge => edge.data('id') === window.SchGraphApp.state.selectedEdge)[0];
        }

        if (!clickedEdge) {
            console.log('No edge to trace from');
            return;
        }

        // First pass: Mark ALL edges in ALL paths as secondary
        paths.forEach((path) => {
            const pathEdges = tracePathBackwards(path, clickedEdge, cy);
            pathEdges.forEach(edge => {
                edge.addClass('trace-highlight-secondary');
            });
        });

        // Second pass: Mark edges in the current path as primary (overwrites secondary)
        if (paths[traceState.currentPathIndex]) {
            const currentPathEdges = tracePathBackwards(paths[traceState.currentPathIndex], clickedEdge, cy);
            currentPathEdges.forEach(edge => {
                edge.removeClass('trace-highlight-secondary');
                edge.addClass('trace-highlight');
            });
        }

        console.log(`Highlighted ${paths.length} paths for message origins`);
    }

    /**
     * Trace backwards from the clicked edge following the path
     */
    function tracePathBackwards(path, startEdge, cy) {
        const pathEdges = [];

        // Always include the clicked edge - it's the endpoint of the trace
        pathEdges.push(startEdge);

        // Build a map of which component consumed which messages to produce which output
        const productionMap = new Map(); // Key: "component|output_msg_id", Value: Set of consumed_msg_ids

        path.forEach(([msgId, componentName, consumedIds]) => {
            if (componentName && consumedIds) {
                const key = `${componentName}|${msgId}`;
                productionMap.set(key, new Set(consumedIds.map(id => Number(id))));
            }
        });

        // Find all edges that are part of this path
        cy.edges().forEach(edge => {
            // Skip the start edge (already added)
            if (edge === startEdge) return;

            const edgeMsgId = Number(edge.data('msg_id'));
            const edgeSource = edge.source().data('name');
            const edgeTarget = edge.target().data('name');

            // Check if this edge represents a message being consumed
            // Look for any production where this edge's target consumed this edge's msg_id
            const productionKey = `${edgeTarget}|*`;

            // Check all productions by the target component
            for (const [key, consumedIds] of productionMap) {
                const [component, outputMsgId] = key.split('|');

                // If this edge goes TO the component that consumed this message
                if (component === edgeTarget && consumedIds.has(edgeMsgId)) {
                    // Verify this edge is from the correct source
                    // Find the producer of this message in the path
                    let correctSource = false;
                    for (const [pathMsgId, pathComponent, _] of path) {
                        if (Number(pathMsgId) === edgeMsgId && pathComponent === edgeSource) {
                            correctSource = true;
                            break;
                        }
                    }

                    if (correctSource) {
                        pathEdges.push(edge);
                        break; // Found it, no need to check other productions
                    }
                }
            }
        });

        return pathEdges;
    }

    /**
     * Update edge details panel with path navigation
     */
    function updateEdgeDetailsWithPaths() {
        const detailsContent = document.getElementById('node-details-content');
        if (!detailsContent || traceState.currentPaths.length === 0) return;

        // Get the selected edge to find its target
        const cy = window.SchGraphApp.viz?.getCy?.();
        let targetNodeName = null;
        if (cy && window.SchGraphApp.state.selectedEdge) {
            const selectedEdge = cy.edges().filter(edge => edge.data('id') === window.SchGraphApp.state.selectedEdge)[0];
            if (selectedEdge) {
                targetNodeName = selectedEdge.target().data('name');
            }
        }

        // Format the path with component names and consumed info
        const currentPath = traceState.currentPaths[traceState.currentPathIndex];

        // Use the compact format: Component(inputs→output)
        const pathStr = currentPath.map(([msgId, component, consumedIds]) => {
            if (!component) return `src(${msgId})`;

            if (consumedIds && consumedIds.length > 0) {
                // Show inputs explicitly
                return `${component}(${consumedIds.join(',')}→${msgId})`;
            } else {
                return `${component}(→${msgId})`;
            }
        }).join(', ');

        // Add the destination if we have it
        const fullPathStr = targetNodeName ? `${pathStr} → ${targetNodeName}` : pathStr;

        // Create path navigation HTML
        const pathNavHTML = `
            <div class="path-navigation mb-3 p-2 bg-light rounded" id="path-navigation-container">
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
                    Path: ${fullPathStr}
                </small>
            </div>
        `;

        // Check if path navigation already exists
        const existingNav = detailsContent.querySelector('#path-navigation-container');
        if (existingNav) {
            // Replace existing navigation
            existingNav.outerHTML = pathNavHTML;
        } else {
            // Insert at the beginning
            detailsContent.insertAdjacentHTML('afterbegin', pathNavHTML);
        }
    }

    window.updateEdgeDetailsWithPaths = updateEdgeDetailsWithPaths;

    /**
     * Navigate between paths
     */
    window.navigatePath = function(direction) {
        traceState.currentPathIndex += direction;
        traceState.currentPathIndex = Math.max(0, Math.min(traceState.currentPathIndex, traceState.currentPaths.length - 1));

        // Re-highlight with new primary path
        clearTraceHighlights();

        // Get the currently selected edge
        const cy = window.SchGraphApp.viz?.getCy?.();
        if (cy && window.SchGraphApp.state.selectedEdge) {
            const selectedEdge = cy.edges().filter(edge => edge.data('id') === window.SchGraphApp.state.selectedEdge)[0];
            if (selectedEdge) {
                highlightPaths(traceState.currentPaths, selectedEdge);
            }
        }

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