// graph.js - Core graph visualization using Cytoscape.js

function initializeVisualization() {
    const app = window.SchGraphApp;
    let cy; // Cytoscape instance

    let layoutState = {
        name: 'fcose',  // Default layout
        stop: null      // Only store the stop function
    };

    let currentForces = {
        springLength: 200,
        springCoeff: 0.0001,
        mass: 4,
        gravity: -0.8
    };

    // Helper function to format labels with line breaks
    function formatLabel(name) {
        if (!name) return '';

        if (name.length <= 16) {
            return name;
        } else {
            // For names longer than 16 chars
            let processedName = name;
            if (name.length > 32) {
                processedName = name.substring(0, 32);
            }

            // Split into two lines at the middle
            const midPoint = Math.floor(processedName.length / 2);
            // Try to find a good break point (space, dash, underscore)
            let breakPoint = midPoint;
            for (let i = midPoint; i >= Math.max(0, midPoint - 8); i--) {
                if (processedName[i] === ' ' || processedName[i] === '-' || processedName[i] === '_') {
                    breakPoint = i;
                    break;
                }
            }

            if (breakPoint === midPoint) {
                // No good break point found, just split at middle
                return processedName.substring(0, midPoint) + '\n' + processedName.substring(midPoint);
            } else {
                // Split at the break point
                return processedName.substring(0, breakPoint) + '\n' + processedName.substring(breakPoint + 1);
            }
        }
    }

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
                        'label': function(ele) {
                            return formatLabel(ele.data('name'));
                        },
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'text-wrap': 'wrap',
                        'text-max-width': '100px',
                        'width': 'label',
                        'height': function(ele) {
                            const name = ele.data('name') || '';
                            return name.length > 16 ? 40 : 25; // Taller for two-line labels
                        },
                        'padding': 10,
                        'shape': 'roundrectangle',
                        'border-width': 1,
                        'border-color': '#fff',
                        'font-size': 14,
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
                        'label': function(ele) {
                            return formatLabel(ele.data('name'));
                        },
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
                name: layoutState.name
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
        let hoveredElement = null; // Track what element is currently hovered

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
            hoveredElement = null;
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
            const container = cy.container();
            const containerRect = container.getBoundingClientRect();
            hoveredElement = node;

            // Build tooltip content with truncated name
            const fullName = data.name || "Node";
            let displayName = fullName;

            if (fullName.length > 16) {
                let processedName = fullName;
                if (fullName.length > 32) {
                    processedName = fullName.substring(0, 32);
                }

                // Split into two lines
                const midPoint = Math.floor(processedName.length / 2);
                let breakPoint = midPoint;
                for (let i = midPoint; i >= Math.max(0, midPoint - 8); i--) {
                    if (processedName[i] === ' ' || processedName[i] === '-' || processedName[i] === '_') {
                        breakPoint = i;
                        break;
                    }
                }

                if (breakPoint === midPoint) {
                    displayName = processedName.substring(0, midPoint) + '<br>' + processedName.substring(midPoint);
                } else {
                    displayName = processedName.substring(0, breakPoint) + '<br>' + processedName.substring(breakPoint + 1);
                }
            }

            let html = `<h4>${displayName}</h4>`;

            // Add parents if available
            if (data.parents && Array.isArray(data.parents) && data.parents.length > 0) {
                const parentNames = data.parents.map(p => {
                    if (typeof p === 'object' && p.name) return p.name;
                    if (typeof p === 'object' && p.id) return p.id;
                    return String(p);
                });
                html += `<p><strong>Parents:</strong> ${escapeHTML(parentNames.join(', '))}</p>`;
            }

            // Add children if available
            if (data.children && Array.isArray(data.children) && data.children.length > 0) {
                const childNames = data.children.map(c => {
                    if (typeof c === 'object' && c.name) return c.name;
                    if (typeof c === 'object' && c.id) return c.id;
                    return String(c);
                });
                html += `<p><strong>Children:</strong> ${escapeHTML(childNames.join(', '))}</p>`;
            }

            // Add description if available
            if (data.description && data.description.trim() !== '') {
                const desc = data.description.length > 150 ?
                    data.description.substring(0, 147) + "..." :
                    data.description;
                html += `<hr><h6>Description</h6><div class="node-description">${escapeHTML(desc)}</div>`;
            }

            // Position and show tooltip
            showTooltip(
                html,
                evt.renderedPosition.x + containerRect.left + 15,
                evt.renderedPosition.y + containerRect.top - 30
            );
        });

        // Hover tooltips for edges
        cy.on('mouseover', 'edge', function(evt) {
            const edge = evt.target;
            const data = edge.data();
            hoveredElement = edge;

            const container = cy.container();
            const containerRect = container.getBoundingClientRect();

            // Build tooltip content
            let html = `<h4>${escapeHTML(data.name || "Edge")}</h4>`;
            html += `<p><strong>From:</strong> ${escapeHTML(edge.source().data('name'))}</p>`;
            html += `<p><strong>To:</strong> ${escapeHTML(edge.target().data('name'))}</p>`;

            // Position and show tooltip (using rendered coordinates)
            showTooltip(
                html,
                evt.renderedPosition.x + containerRect.left + 15,
                evt.renderedPosition.y + containerRect.top - 30
            );
        });

        // Mouse move - update tooltip position when hovering
        cy.on('mousemove', function(evt) {
            if (hoveredElement && !app.state.isMouseDown && tooltip.style.opacity !== "0") {
                const container = cy.container();
                const containerRect = container.getBoundingClientRect();

                // Update tooltip position to follow cursor
                tooltip.style.left = (evt.renderedPosition.x + containerRect.left + 15) + "px";
                tooltip.style.top = (evt.renderedPosition.y + containerRect.top - 30) + "px";
            }
        });

        // Track mouse down/up state to hide tooltip when dragging
        cy.on('mousedown', function(evt) {
            app.state.isMouseDown = true;
            if (hoveredElement) {
                hideTooltip();
            }
        });

        cy.on('mouseup', function(evt) {
            app.state.isMouseDown = false;
        });


        cy.on('mouseout', 'node', function(evt) {
            hideTooltip();
        });

        // Hide tooltip when mouse leaves edges
        cy.on('mouseout', 'edge', function(evt) {
            hideTooltip();
        });
    }

    function updateGraph(graphData) {
        if (!cy) {
            cy = initCytoscape();
        }

        // Stop any running layout
        if (layoutState.stop) {
            layoutState.stop();
            layoutState.stop = null;
        }

        // Save current positions
        const oldPositions = {};
        cy.nodes().forEach(node => {
            const pos = node.position();
            oldPositions[node.id()] = { x: pos.x, y: pos.y };
        });

        // Extract new graph data
        let newNodes = [];
        let newEdges = [];

        if (graphData.elements) {
            newNodes = graphData.elements.nodes || [];
            newEdges = graphData.elements.edges || [];
        } else {
            // Handle old format
            newNodes = (graphData.nodes || []).map(node => ({
                data: { id: node.name, ...node }
            }));
            newEdges = (graphData.edges || []).map(edge => ({
                data: {
                    id: `${edge.source}_${edge.target}_${Math.random()}`,
                    source: edge.source,
                    target: edge.target,
                    ...edge
                }
            }));
        }

        // Create sets of IDs for comparison
        const currentNodeIds = new Set(cy.nodes().map(n => n.id()));
        const currentEdgeIds = new Set(cy.edges().map(e => e.id()));
        const newNodeIds = new Set(newNodes.map(n => n.data.id));
        const newEdgeIds = new Set(newEdges.map(e => e.data.id));

        // Find differences
        const nodesToRemove = [...currentNodeIds].filter(id => !newNodeIds.has(id));
        const nodesToAdd = newNodes.filter(n => !currentNodeIds.has(n.data.id));
        const nodesToUpdate = newNodes.filter(n => currentNodeIds.has(n.data.id));

        const edgesToRemove = [...currentEdgeIds].filter(id => !newEdgeIds.has(id));
        const edgesToAdd = newEdges.filter(e => !currentEdgeIds.has(e.data.id));

        nodesToRemove.forEach(id => {
            cy.getElementById(id).remove();
        });

        // Remove edges that are gone
        edgesToRemove.forEach(id => {
            cy.getElementById(id).remove();
        });

        // Update existing nodes (update their data but keep positions)
        nodesToUpdate.forEach(nodeData => {
            const existingNode = cy.getElementById(nodeData.data.id);
            if (existingNode) {
                // Update data while preserving position
                const currentPos = existingNode.position();
                existingNode.data(nodeData.data);
                existingNode.position(currentPos);
            }
        });

        // Add new nodes
        nodesToAdd.forEach((nodeData) => {
            const nodeId = nodeData.data.id;

            // Find edges that connect to this new node
            const incomingEdges = newEdges.filter(e => e.data.target === nodeId);
            const parentIds = incomingEdges.map(e => e.data.source);

            // Get existing parent nodes
            const parentNodes = parentIds
                .map(id => cy.getElementById(id))
                .filter(node => node && node.length > 0);

            if (parentNodes.length > 0) {
                // Position below the average position of parents
                let avgX = 0, avgY = 0;
                parentNodes.forEach(parent => {
                    const pos = parent.position();
                    avgX += pos.x;
                    avgY += pos.y;
                });
                nodeData.position = {
                    x: avgX / parentNodes.length,
                    y: (avgY / parentNodes.length) + 100  // 100 pixels below parents
                };
            } else {
                // No parents - place at origin (layout will handle it)
                nodeData.position = { x: 0, y: 0 };
            }
        });

        cy.add(nodesToAdd);

        // Add new edges
        cy.add(edgesToAdd);

        // Restore positions for nodes that existed before
        cy.nodes().forEach(node => {
            const nodeId = node.id();
            if (oldPositions[nodeId]) {
                node.position(oldPositions[nodeId]);
            }
        });
        runLayout();
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
                nodeOverlap: 1,
                nodeRepulsion: 2000,  // Much lower
                numIter: 2500,
                tile: true,
                tilingPaddingVertical: 10,
                tilingPaddingHorizontal: 10,
                randomize: true,
                quality: 'default'
            },
            'breadthfirst': {
                directed: true,
                spacingFactor: 1,
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
            'circle': {
                avoidOverlap: true,
                avoidOverlapPadding: 30,
                radius: function(){
                    const nodeCount = cy.nodes().length;
                    const minRadius = 50;
                    const radiusPerNode = 5;
                    return Math.max(minRadius, nodeCount * radiusPerNode);
                },
                startAngle: 0,
                sweep: (() => {
                    const nodeCount = cy.nodes().length;
                    if (nodeCount <= 1) return 2 * Math.PI;
                    // Leave a gap to prevent first and last node overlap
                    return 2 * Math.PI * (nodeCount - 1) / nodeCount;
                })(),
                clockwise: true,
            },
            'concentric': {
                minNodeSpacing: 80,
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
        };

        return Object.assign(baseOptions, layoutConfigs[layoutType] || {});
    }

    // Run the current layout
    function runLayout() {
        // Stop previous if exists
        if (layoutState.stop) {
            layoutState.stop();
            layoutState.stop = null;
        }

        const layoutOptions = getLayoutOptions(layoutState.name);
        setTimeout(() => {
            const layout = cy.layout(layoutOptions);
            layoutState.stop = () => layout.stop();
            layout.run();
        }, 100);
    }

    // Set layout by name
    function setLayout(newLayoutName) {
        layoutState.name = newLayoutName;
        runLayout();

        // Update UI to show current layout
        const layoutDisplay = document.getElementById('current-layout');
        if (layoutDisplay) {
            const layoutNames = {
                'fcose': 'fCoSE',
                'breadthfirst': 'Tree',
                'dagre': 'Dagre',
                'klay': 'Klay',
                'circle': 'Circle',
                'concentric': 'Concentric',
                'grid': 'Grid',
            };
            layoutDisplay.textContent = layoutNames[layoutState.name] || layoutState.name;
        }
    }

    // Toggle between layouts
    function toggleTreeLayout() {
        layoutState.name = layoutState.name === 'cose' ? 'breadthfirst' : 'cose';
        runLayout();
        return layoutState.name === 'breadthfirst';
    }

    // Update force parameters
    function updateForces(forces) {
        // Only apply to physics layouts
        if (!['fcose'].includes(layoutState.name)) {
            return;
        }

        // Update current forces
        Object.assign(currentForces, forces);

        // Stop current layout if running
        if (layoutState.stop) {
            layoutState.stop();
            layoutState.stop = null;
        }

        // For fCoSE, only handle spring length
        if (layoutState.name === 'fcose' && forces.springLength !== undefined) {
            const currentPositions = {};
            cy.nodes().forEach(node => {
                currentPositions[node.id()] = {
                    x: node.position('x'),
                    y: node.position('y')
                };
            });

            const options = getLayoutOptions(layoutState.name);
            options.idealEdgeLength = forces.springLength;

            options.randomize = false;
            options.positions = node => {
                const pos = currentPositions[node.id()];
                return pos ? { x: pos.x, y: pos.y } : undefined;
            };
            options.fit = false;
            options.animate = true;
            options.animationDuration = 300;
            options.animationEasing = 'ease-out';
            options.numIter = 250;

            const layout = cy.layout(options);
            layoutState.stop = () => layout.stop();
            layout.run();
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

    function stopCurrentLayout() {
        if (layoutState.stop) {
            layoutState.stop();
            layoutState.stop = null;
        }
    }

    // Return public API
    return {
        updateGraph,
        resetZoom,
        toggleTreeLayout,
        updateForces,
        exportAsPNG,
        setLayout,
        stopCurrentLayout,
        getCy: () => cy, // Expose cy instance for debugging
    };
}