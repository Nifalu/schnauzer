// graph.js - Core graph visualization using Cytoscape.js

function initializeVisualization() {
    const app = window.SchGraphApp;
    let cy; // Cytoscape instance
    let currentLayout; // Current layout instance
    let layoutName = 'cose'; // Default to built-in cose layout

    // Initialize Cytoscape
    function initCytoscape() {
        cy = cytoscape({
            container: document.getElementById('graph-container'),

            style: [
                // Default node styling
                {
                    selector: 'node',
                    style: {
                        'background-color': 'data(color)',
                        'label': 'data(name)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'text-wrap': 'wrap',
                        'text-max-width': '100px',
                        'width': 'label',
                        'height': 60,
                        'padding': 20,
                        'shape': 'roundrectangle',
                        'border-width': 2,
                        'border-color': '#fff',
                        'font-size': 12,
                        'color': function(ele) {
                            return window.SchGraphApp.utils.getTextColor(ele.data('color') || '#999');
                        }
                    }
                },

                // Default edge styling
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': 'data(color)',
                        'target-arrow-color': 'data(color)',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'control-point-step-size': 40,
                        'label': 'data(name)',
                        'font-size': 10,
                        'text-rotation': 'autorotate',
                        'text-margin-y': -10
                    }
                },

                // Multi-edge handling
                {
                    selector: 'edge.multiple',
                    style: {
                        'curve-style': 'bezier',
                        'control-point-step-size': 40
                    }
                },

                // Selected node/edge styling
                {
                    selector: ':selected',
                    style: {
                        'border-width': 4,
                        'border-color': '#007bff'
                    }
                },

                // Hover effects
                {
                    selector: 'node:active',
                    style: {
                        'overlay-padding': 10,
                        'overlay-opacity': 0.2
                    }
                },

                // Search highlighting
                {
                    selector: '.dimmed',
                    style: {
                        'opacity': 0.2
                    }
                },
                {
                    selector: '.highlighted',
                    style: {
                        'opacity': 1,
                        'z-index': 999
                    }
                }
            ],

            // Layout options
            layout: {
                name: layoutName
            },

            // Interaction options
            minZoom: 0.1,
            maxZoom: 4,
            wheelSensitivity: 0.2
        });

        // Set up event handlers
        setupEventHandlers();

        return cy;
    }

    // Set up event handlers for nodes and edges
    function setupEventHandlers() {
        const tooltip = document.querySelector(".graph-tooltip");
        let tooltipTimeout;

        // Helper function to show tooltip
        function showTooltip(html, x, y) {
            clearTimeout(tooltipTimeout);
            tooltip.innerHTML = html;
            tooltip.style.left = x + "px";
            tooltip.style.top = y + "px";
            tooltip.style.opacity = "0.95";
        }

        // Helper function to hide tooltip
        function hideTooltip() {
            tooltipTimeout = setTimeout(() => {
                tooltip.style.opacity = "0";
            }, 100);
        }

        // Node click - show details panel
        cy.on('tap', 'node', function(evt) {
            const node = evt.target;
            const data = node.data();

            // Update selected state
            app.state.selectedNode = data.id;
            app.state.selectedEdge = null;

            // Show details panel
            app.elements.nodeDetails.classList.remove('d-none');
            app.elements.nodeDetailsTitle.textContent = data.name || "Node Details";

            // Apply colors to header
            const headerEl = app.elements.nodeDetails.querySelector('.card-header');
            if (headerEl) {
                headerEl.style.backgroundColor = data.color || '#999';
                headerEl.style.color = window.SchGraphApp.utils.getTextColor(data.color || '#999');
            }

            // Format and display node details
            app.elements.nodeDetailsContent.innerHTML = window.SchGraphApp.utils.formatNodeDetails(data);
        });

        // Edge click - show details panel
        cy.on('tap', 'edge', function(evt) {
            const edge = evt.target;
            const data = edge.data();

            // Update selected state
            app.state.selectedEdge = data.id;
            app.state.selectedNode = null;

            // Show details panel
            app.elements.nodeDetails.classList.remove('d-none');
            app.elements.nodeDetailsTitle.textContent = data.name || "Edge Details";

            // Format and display edge details
            app.elements.nodeDetailsContent.innerHTML = window.SchGraphApp.utils.formatEdgeDetails(data);
        });

        // Background click - hide details
        cy.on('tap', function(evt) {
            if (evt.target === cy) {
                app.elements.nodeDetails.classList.add('d-none');
                app.state.selectedNode = null;
                app.state.selectedEdge = null;
            }
        });

        // Hover tooltips for nodes
        cy.on('mouseover', 'node', function(evt) {
            const node = evt.target;
            const data = node.data();
            const renderedPosition = node.renderedPosition();
            const container = cy.container();
            const containerRect = container.getBoundingClientRect();

            // Build tooltip content
            let html = `<h4>${escapeHTML(data.name || "Node")}</h4>`;

            if (data.description) {
                const desc = data.description.length > 150 ?
                    data.description.substring(0, 147) + "..." :
                    data.description;
                html += `<hr><h6>Description</h6><div class="node-description">${escapeHTML(desc)}</div>`;
            }

            // Position and show tooltip
            showTooltip(
                html,
                containerRect.left + renderedPosition.x + 15,
                containerRect.top + renderedPosition.y - 30
            );
        });

        // Hover tooltips for edges
        cy.on('mouseover', 'edge', function(evt) {
            const edge = evt.target;
            const data = edge.data();
            const midpoint = edge.midpoint();
            const container = cy.container();
            const containerRect = container.getBoundingClientRect();

            // Build tooltip content
            let html = `<h4>${escapeHTML(data.name || "Edge")}</h4>`;
            html += `<p><strong>From:</strong> ${escapeHTML(edge.source().data('name'))}</p>`;
            html += `<p><strong>To:</strong> ${escapeHTML(edge.target().data('name'))}</p>`;

            // Position and show tooltip
            showTooltip(
                html,
                containerRect.left + midpoint.x + 15,
                containerRect.top + midpoint.y - 30
            );
        });

        // Hide tooltip on mouseout
        cy.on('mouseout', 'node, edge', function() {
            hideTooltip();
        });
    }

    // Update graph with new data
    function updateGraph(graphData) {
        if (!cy) {
            cy = initCytoscape();
        }

        // Clear existing elements
        cy.elements().remove();

        // Add new elements
        if (graphData.elements) {
            cy.add(graphData.elements);
        } else {
            // Handle old format
            const elements = {
                nodes: graphData.nodes?.map(node => ({
                    data: {
                        id: node.name,
                        ...node
                    }
                })) || [],
                edges: graphData.edges?.map(edge => ({
                    data: {
                        id: `${edge.source}_${edge.target}_${Math.random()}`,
                        source: edge.source,
                        target: edge.target,
                        ...edge
                    }
                })) || []
            };
            cy.add(elements);
        }

        // Apply layout
        runLayout();

        // Update stats
        updateGraphStats();
    }

    // Get layout options for different layout types
    function getLayoutOptions(layoutType) {
        const baseOptions = {
            name: layoutType,
            animate: true,
            animationDuration: 1000,
            fit: true,
            padding: 50
        };

        // Layout-specific options
        const layoutConfigs = {
            'fcose': {
                idealEdgeLength: 200,
                nodeOverlap: 50,
                nodeRepulsion: 4500,
                numIter: 2500,
                tile: true,
                tilingPaddingVertical: 10,
                tilingPaddingHorizontal: 10,
                randomize: true
            },
            'cose': {
                idealEdgeLength: 200,
                nodeOverlap: 20,
                nodeRepulsion: 400000,
                numIter: 1000,
                gravity: 80,
                randomize: true
            },
            'cola': {
                nodeSpacing: 50,
                edgeLength: 200,
                alignment: 'center',
                randomize: true
            },
            'breadthfirst': {
                directed: true,
                spacingFactor: 1.5,
                avoidOverlap: true,
                circle: false,
                grid: false,
                maximal: false
            },
            'dagre': {
                rankDir: 'TB', // Top to bottom
                rankSep: 100,
                nodeSep: 50,
                edgeSep: 25,
                ranker: 'network-simplex'
            },
            'klay': {
                direction: 'DOWN',
                spacing: 50,
                layoutHierarchy: true,
                compactComponents: true
            },
            'circle': {
                avoidOverlap: true,
                radius: undefined, // Auto-calculate
                startAngle: 0,
                sweep: 2 * Math.PI,
                clockwise: true
            },
            'concentric': {
                minNodeSpacing: 50,
                levelWidth: function() { return 2; },
                concentric: function(node) {
                    return node.degree();
                }
            },
            'grid': {
                avoidOverlap: true,
                avoidOverlapPadding: 10,
                condense: false
            },
            'random': {
                boundingBox: undefined // Use full area
            }
        };

        return Object.assign(baseOptions, layoutConfigs[layoutType] || {});
    }

    // Run the current layout
    function runLayout() {
        if (currentLayout) {
            currentLayout.stop();
        }

        // Check if layout is available
        const availableLayouts = ['cose', 'breadthfirst', 'circle', 'concentric', 'grid', 'random'];

        // Check for extension layouts
        if (typeof cytoscape !== 'undefined') {
            if (layoutName === 'fcose' && !cy._private.extensions['fcose']) {
                console.warn('fCoSE layout not loaded, falling back to CoSE');
                layoutName = 'cose';
            } else if (layoutName === 'cola' && !cy._private.extensions['cola']) {
                console.warn('Cola layout not loaded, falling back to CoSE');
                layoutName = 'cose';
            } else if (layoutName === 'dagre' && !cy._private.extensions['dagre']) {
                console.warn('Dagre layout not loaded, falling back to breadthfirst');
                layoutName = 'breadthfirst';
            }
        }

        const layoutOptions = getLayoutOptions(layoutName);

        try {
            currentLayout = cy.layout(layoutOptions);
            currentLayout.run();
        } catch (error) {
            console.error('Layout error:', error);
            // Fallback to a simple layout
            layoutName = 'cose';
            const fallbackOptions = getLayoutOptions('cose');
            currentLayout = cy.layout(fallbackOptions);
            currentLayout.run();
        }
    }

    // Set layout by name
    function setLayout(newLayoutName) {
        layoutName = newLayoutName;
        runLayout();

        // Update UI to show current layout
        const layoutDisplay = document.getElementById('current-layout');
        if (layoutDisplay) {
            const layoutNames = {
                'fcose': 'fCoSE',
                'cose': 'CoSE',
                'cola': 'Cola',
                'breadthfirst': 'Tree',
                'dagre': 'Dagre',
                'klay': 'Klay',
                'circle': 'Circle',
                'concentric': 'Concentric',
                'grid': 'Grid',
                'random': 'Random'
            };
            layoutDisplay.textContent = layoutNames[layoutName] || layoutName;
        }
    }

    // Toggle between layouts
    function toggleTreeLayout() {
        layoutName = layoutName === 'cose' ? 'breadthfirst' : 'cose';
        runLayout();
        return layoutName === 'breadthfirst';
    }

    // Update force parameters
    function updateForces(forces) {
        // Only apply to force-directed layouts
        if (['fcose', 'cose', 'cola'].includes(layoutName)) {
            const options = getLayoutOptions(layoutName);

            if (forces.charge !== undefined) {
                if (layoutName === 'fcose') {
                    options.nodeRepulsion = Math.abs(forces.charge) * 2.5;
                } else if (layoutName === 'cose') {
                    options.nodeRepulsion = Math.abs(forces.charge) * 200;
                }
            }
            if (forces.linkDistance !== undefined) {
                options.idealEdgeLength = forces.linkDistance;
                if (layoutName === 'cola') {
                    options.edgeLength = forces.linkDistance;
                }
            }
            if (forces.collisionStrength !== undefined) {
                options.nodeOverlap = 50 * forces.collisionStrength;
            }

            currentLayout = cy.layout(options);
            currentLayout.run();
        }
    }

    // Toggle physics on/off
    function togglePhysics(enabled) {
        // Physics only makes sense for force-directed layouts
        const forceLayouts = ['fcose', 'cose', 'cola'];

        if (forceLayouts.includes(layoutName)) {
            if (enabled) {
                // Re-enable layout
                runLayout();
            } else {
                // Stop current layout
                if (currentLayout) {
                    currentLayout.stop();
                }
            }
            return true; // Physics toggled
        } else {
            // For non-force layouts, physics doesn't apply
            return false; // Physics not applicable
        }
    }

    // Reset zoom and center
    function resetZoom() {
        cy.fit(50); // 50px padding
    }

    // Update graph statistics
    function updateGraphStats() {
        if (app.elements.nodeCountEl) {
            app.elements.nodeCountEl.textContent = cy.nodes().length;
        }
        if (app.elements.edgeCountEl) {
            app.elements.edgeCountEl.textContent = cy.edges().length;
        }
    }

    // Export graph as PNG
    function exportAsPNG() {
        const blob = cy.png({
            output: 'blob',
            bg: '#f9f9f9',
            scale: 2 // Higher resolution
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = `${window.graphTitle || 'graph'}.png`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Initialize on first call
    if (!cy) {
        cy = initCytoscape();
    }

    // Return public API
    return {
        updateGraph,
        resetZoom,
        togglePhysics,
        toggleTreeLayout,
        updateForces,
        exportAsPNG,
        setLayout,
        getCy: () => cy // Expose cy instance for debugging
    };
}