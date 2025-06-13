// graph.js - Core graph visualization functionality
// Handles the D3.js SVG setup and rendering

function initializeVisualization() {
    const app = window.SchGraphApp;
    const width = app.elements.graphContainer.clientWidth;
    const height = app.elements.graphContainer.clientHeight;

    let svg, zoom, simulation, node, link;

    function getNodeDimensions(node) {
        const label = node.name || node.id || "Unknown";
        // Increase default width and make dynamic calculation more generous
        return {
            width: Math.max(100, label.length * 6), // Increased from 100 to 120 and multiplier from 8 to 10
            height: 60
        };
    }

    // Create SVG container
    svg = d3.select("#graph-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Create a group for the graph that can be transformed
    const g = svg.append("g");

    // Set up zoom behavior
    zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);

    // Create marker for arrow
    svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "-0 -5 10 10")
        .attr("refX", 0)  // Changed from original value
        .attr("refY", 0)
        .attr("orient", "auto")
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("overflow", "visible")
        .append("svg:path")
        .attr("d", "M 0,-5 L 10,0 L 0,5")
        .attr("fill", "#999")
        .style("stroke", "none");

    // Get tooltip element
    const tooltip = d3.select(".graph-tooltip");

    // Track tooltip state
    let tooltipVisible = false;
    let currentTooltipNode = null;

    // Add mouse event listeners to track mouse state
    svg.on("mousedown", function() {
        app.state.isMouseDown = true;

        // Hide tooltip immediately on mousedown
        hideTooltip();
    });

    svg.on("mouseup", function() {
        app.state.isMouseDown = false;
    });

    // Ensure mouse up is detected even if released outside the SVG
    document.addEventListener("mouseup", function() {
        app.state.isMouseDown = false;
    });

    function showNodeTooltip(event, d) {
        // Don't show tooltip if mouse is pressed (during dragging)
        if (app.state.isMouseDown) return;

        // Set current node
        currentTooltipNode = d;

        let html = ``

        html += `<h4>${escapeHTML(d.name || "Node")}</h4>`;

        // Format the description for hover tooltip
        if (d.description) {
            let description = d.description;
            description += d.description.length > 150 ?
                escapeHTML(description.substring(0, 147) + "...") :
                escapeHTML(description);
            html += `
                <hr>
                <h6>Description</h6>
                <div class="node-description">${description}</div>
            `;
        }

        // Format parent and child names for tooltip using pre-calculated data
        if (d.parents && d.parents.length > 0) {
            html += `<p><strong>Parents:</strong><br>`;
            html += escapeHTML(d.parents.map(p => p.name).join('\n'));
            html += `</p>`;
        }

        if (d.children && d.children.length > 0) {
            html += `<p><strong>Children:</strong><br>`;
            html += escapeHTML(d.children.map(p => p.name).join('\n'));
            html += `</p>`;
        }

        // Update tooltip content with enhanced information
        tooltip.html(html);

        // Position the tooltip
        tooltip
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");

        // Make tooltip visible
        tooltip
            .transition()
            .duration(50)
            .style("opacity", 0.95);

        tooltipVisible = true;
    }

    // Show tooltip for edges
    function showEdgeTooltip(event, d) {
        // Don't show tooltip if mouse is pressed (during dragging)
        if (app.state.isMouseDown) return;

        // Set current edge
        currentTooltipNode = d;

        // Get source and target names
        const sourceName = typeof d.source === 'object' ?
            (d.source.name) : d.source;
        const targetName = typeof d.target === 'object' ?
            (d.target.name) : d.target;

        // Update tooltip content
        tooltip.html(`
            <h4>${escapeHTML(d.name) || "Edge"}</h4>
            <p><strong>From:</strong> ${escapeHTML(sourceName)}</p>
            <p><strong>To:</strong> ${escapeHTML(targetName)}</p>
        `);

        // Position the tooltip near the cursor
        tooltip
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");

        // Make tooltip visible with a very short transition
        tooltip
            .transition()
            .duration(50)
            .style("opacity", 0.95);

        tooltipVisible = true;
    }

    // Hide tooltip function
    function hideTooltip() {
        // Only transition if tooltip was visible
        if (tooltipVisible) {
            tooltip
                .transition()
                .duration(50)
                .style("opacity", 0);

            tooltipVisible = false;
            currentTooltipNode = null;
        }
    }

    function applyDagreLayout(nodes, edges, width, height) {
        // Create a new directed graph
        const g = new dagre.graphlib.Graph({
            multigraph: true,
            directed: true,
            compound: false,
        });

        // Set graph properties
        g.setGraph({
            rankdir: "TB",     // Top to bottom
            align: "UL",       // Align to upper left
            nodesep: 50,       // Horizontal space between nodes
            ranksep: 100,      // Vertical space between ranks
            marginx: 40,
            marginy: 40,
            ranker: "network-simplex",
            edgesep:25,
        });

        // Default node settings
        g.setDefaultNodeLabel(() => ({}));

        // Add nodes with their dimensions
        nodes.forEach(node => {
            const dims = getNodeDimensions(node);
            g.setNode(node.name, {
                width: dims.width,
                height: dims.height,
                label: node.name
            });
        });

        // Add edges (dagre will handle cycles automatically)
        edges.forEach(edge => {
            // For multigraphs, we need unique edge identifiers
            const edgeKey = edge.key || "0";
            g.setEdge(
                edge.source.name || edge.source,
                edge.target.name || edge.target,
                {
                    label: edge.name,
                    key: edgeKey
                },
                `${edge.source}-${edge.target}-${edgeKey}` // unique name for multigraph support
            );
        });

        // Run the layout algorithm
        dagre.layout(g);

        // Get the graph dimensions
        const graphInfo = g.graph();

        // Calculate scaling to fit in viewport
        const scaleX = (width - 100) / graphInfo.width;
        const scaleY = (height - 100) / graphInfo.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

        // Calculate offset to center the graph
        const offsetX = (width - graphInfo.width * scale) / 2;
        const offsetY = (height - graphInfo.height * scale) / 2;

        // Apply the computed positions to nodes
        nodes.forEach(node => {
            const dagreNode = g.node(node.name);
            if (dagreNode) {
                node.x = dagreNode.x * scale + offsetX;
                node.y = dagreNode.y * scale + offsetY;
                // Store dagre positions for force layout reference
                node.dagreX = node.x;
                node.dagreY = node.y;
            }
        });

        // Dagre has already handled cycles by determining the best rank for each node
        // Cycle edges will naturally be drawn as longer curves
    }

    let useTreeLayout = false;

    // Render a graph from data
    function updateGraph(graph) {
        // Ensure graph has nodes and links arrays
        if (!graph.nodes) graph.nodes = [];
        if (!graph.edges) graph.edges = [];

        // Update counters if the app has stats elements
        if (app.elements.nodeCountEl) {
            app.elements.nodeCountEl.textContent = graph.nodes.length;
        }
        if (app.elements.edgeCountEl) {
            app.elements.edgeCountEl.textContent = graph.edges.length;
        }

        // Clear existing graph elements
        g.selectAll(".node").remove();
        g.selectAll(".link-group").remove();

        // Create dynamic markers for different colored edges
        const defs = svg.select("defs");
        const colors = new Set();

        // Add default color
        colors.add("#999");

        // Build a map for edges between nodes (directed)
        const edgeGroups = new Map();
        graph.edges.forEach(edge => {
            if (edge.color) {
                colors.add(edge.color);
            }

            // Handle both string and object forms
            const sourceName = typeof edge.source === 'object' ? edge.source.name : edge.source;
            const targetName = typeof edge.target === 'object' ? edge.target.name : edge.target;
            const key = `${sourceName}→${targetName}`;

            if (!edgeGroups.has(key)) {
                edgeGroups.set(key, []);
            }
            edgeGroups.get(key).push(edge);
        });

        // Assign curve offsets for multiple edges between same source→target
        graph.edges.forEach(edge => {
            // Handle both string and object forms of source/target
            const sourceName = typeof edge.source === 'object' ? edge.source.name : edge.source;
            const targetName = typeof edge.target === 'object' ? edge.target.name : edge.target;
            const key = `${sourceName}→${targetName}`;

            const edgeGroup = edgeGroups.get(key);

            if (edgeGroup && edgeGroup.length > 1) {
                // Multiple edges from same source to same target
                const index = edgeGroup.indexOf(edge);
                const totalEdges = edgeGroup.length;

                // Space them out with curves
                const spacing = 50; // pixels between parallel edges
                edge.curveOffset = (index - (totalEdges - 1) / 2) * spacing;
            } else {
                // Single edge - straight line
                edge.curveOffset = 0;
            }
        });

        // Clear existing markers
        defs.selectAll("marker").remove();

        // Create a marker for each color
        colors.forEach(color => {
            const markerId = "arrowhead-" + color.replace('#', '');
            defs.append("marker")
                .attr("id", markerId)
                .attr("viewBox", "-0 -5 10 10")
                .attr("refX", 5)  // Position in middle
                .attr("refY", 0)
                .attr("orient", "auto")
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("markerUnits", "strokeWidth")
                .append("svg:path")
                .attr("d", "M 0,-5 L 10,0 L 0,5")
                .attr("fill", color)
                .style("stroke", "none");
        });

        // Apply dagre layout if in tree mode
        if (useTreeLayout) {
            applyDagreLayout(graph.nodes, graph.edges, width, height);
        }

        // Create simulation with appropriate forces
        if (useTreeLayout) {
            // Minimal forces to respect dagre layout
            simulation = d3.forceSimulation(graph.nodes)
                .force("link", d3.forceLink(graph.edges)
                    .id(d => d.name)
                    .distance(150)
                    .strength(0.1))
                .force("charge", d3.forceManyBody()
                    .strength(-300)
                    .distanceMin(30))
                .force("collide", d3.forceCollide()
                    .radius(d => getNodeDimensions(d).width / 2 + 10))
                // Strong forces to maintain dagre positions
                .force("x", d3.forceX(d => d.dagreX || width / 2).strength(0.8))
                .force("y", d3.forceY(d => d.dagreY || height / 2).strength(0.8))
                .alpha(0.3); // Start with low alpha
        } else {
            // Set up force simulation
            simulation = d3.forceSimulation(graph.nodes)
                .force("link", d3.forceLink(graph.edges)
                    .id(d => d.name)
                    .distance(200)
                    .strength(0.5))
                .force("charge", d3.forceManyBody()
                    .strength(-1800)
                    .distanceMin(150)
                    .distanceMax(500))
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("collide", d3.forceCollide().radius(100).strength(1.0))
                .force("x", d3.forceX(width / 2).strength(0.07))
                .force("y", d3.forceY(height / 2).strength(0.07));
        }

        // Create links with wider click/hover areas
        link = g.selectAll(".link-group")
            .data(graph.edges)
            .enter()
            .append("g")  // Use a group to contain both visible line and invisible click area
            .attr("class", "link-group");

        // Add the visible line
        link.append("path")  // Use path instead of line
            .attr("class", "link")
            .attr("stroke-width", 2)
            .attr("stroke", d => d.color || "#999")
            .attr("fill", "none")  // Important for paths
            .style("fill", "none")
            .attr("marker-mid", function(d) {
                const color = d.color || "#999";
                const markerId = "arrowhead-" + color.replace('#', '');
                return "url(#" + markerId + ")";
            });

        link.append("path")
            .attr("class", "link-hitarea")
            .attr("stroke-width", 15)
            .attr("fill", "none")  // IMPORTANT: Also set fill to none for hitarea
            .attr("stroke", "rgba(0,0,0,0)")  // Use rgba instead of "transparent"
            .attr("opacity", 0)  // Set entire element opacity to 0
            .attr("pointer-events", "stroke")  // Still capture mouse events
            .style("cursor", "pointer");


        // Add events to the group
        link.on("click", edgeClicked)
            .on("mouseover", function(event, d) {
                if (!app.state.isMouseDown) {
                    // Highlight the visible line
                    d3.select(this).select(".link").attr("stroke-width", 4);
                    showEdgeTooltip(event, d);
                }
            })
            .on("mousemove", function(event, d) {
                // Update tooltip position if it's for the current edge
                if (tooltipVisible && currentTooltipNode === d) {
                    tooltip
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 30) + "px");
                }
            })
            .on("mouseout", function() {
                // Reset line width
                d3.select(this).select(".link").attr("stroke-width", 2);
                hideTooltip();
            });

        // Create node groups
        node = g.selectAll(".node")
            .data(graph.nodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", dragStarted)
                .on("drag", dragged)
                .on("end", dragEnded))
            .on("click", nodeClicked);

        // Add square nodes with text wrapping
        node.append("rect")
            .attr("width", d => getNodeDimensions(d).width)
            .attr("height", d => getNodeDimensions(d).height)
            .attr("x", d => -getNodeDimensions(d).width / 2)
            .attr("y", d => -getNodeDimensions(d).height / 2)
            .attr("rx", 6)
            .attr("ry", 6)
            .attr("fill", d => d.color)
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

        // Add text with improved wrapping
        node.each(function(d) {
            const name = d.name || "Unknown";
            const nodeWidth = getNodeDimensions(d).width - 20; // Padding
            const text = d3.select(this).append("text")
                .attr("text-anchor", "middle")
                .attr("fill", d => getNodeTextColor(d))
                .attr("pointer-events", "none");

            // Improved text wrapping algorithm that handles long words without spaces
            let words = name.split(/\s+/);
            let line = "";
            let lineNumber = 0;
            const lineHeight = 20;
            const maxCharPerLine = Math.floor(nodeWidth / 7); // Approx. character width

            for (let i = 0; i < words.length; i++) {
                let word = words[i];

                // Handle very long words by splitting them
                if (word.length > maxCharPerLine) {
                    // If line is not empty, add it first
                    if (line) {
                        text.append("tspan")
                            .attr("x", 0)
                            .attr("y", 0)
                            .attr("dy", lineNumber * lineHeight)
                            .text(line);
                        lineNumber++;
                        line = "";
                    }

                    // Split long word into chunks
                    while (word.length > 0) {
                        const chunk = word.substring(0, maxCharPerLine - 1);
                        word = word.substring(maxCharPerLine - 1);

                        // Add hyphen if not at the end
                        const displayChunk = word.length > 0 ? chunk + "-" : chunk;

                        text.append("tspan")
                            .attr("x", 0)
                            .attr("y", 0)
                            .attr("dy", lineNumber * lineHeight)
                            .text(displayChunk);
                        lineNumber++;
                    }
                } else {
                    // Normal word processing
                    let testLine = line + (line ? " " : "") + word;
                    if (testLine.length * 7 > nodeWidth) {
                        // Add the current line
                        text.append("tspan")
                            .attr("x", 0)
                            .attr("y", 0)
                            .attr("dy", lineNumber * lineHeight)
                            .text(line);
                        line = word;
                        lineNumber++;
                    } else {
                        line = testLine;
                    }
                }
            }

            // Add the last line if not empty
            if (line) {
                text.append("tspan")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("dy", lineNumber * lineHeight)
                    .text(line);
            }
        });

        // Add tooltip events with improved responsiveness
        node.on("mouseover", function(event, d) {
            if (!app.state.isMouseDown) {
                showNodeTooltip(event, d);
            }
        })
        .on("mousemove", function(event, d) {
            // Update tooltip position if it's for the current node
            if (tooltipVisible && currentTooltipNode === d) {
                tooltip
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 30) + "px");
            }
        })
        .on("mouseout", function() {
            hideTooltip();
        });

        simulation.on("tick", () => {
            link.each(function(d) {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                let pathData;

                if (d.curveOffset === undefined || d.curveOffset === null || d.curveOffset === 0) {
                    // Straight line
                    pathData = `M ${d.source.x},${d.source.y} L ${d.target.x},${d.target.y}`;
                } else {
                    // Curved path
                    const scaleFactor = Math.min(distance / 200, 1);
                    const actualOffset = d.curveOffset * scaleFactor * 0.5;

                    const midX = (d.source.x + d.target.x) / 2;
                    const midY = (d.source.y + d.target.y) / 2;

                    const perpX = -dy / distance * actualOffset;
                    const perpY = dx / distance * actualOffset;

                    const ctrlX = midX + perpX;
                    const ctrlY = midY + perpY;

                    pathData = `M ${d.source.x},${d.source.y} Q ${ctrlX},${ctrlY} ${d.target.x},${d.target.y}`;
                }

                // Update paths
                d3.select(this).select(".link").attr("d", pathData);
                d3.select(this).select(".link-hitarea").attr("d", pathData);
            });

            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });
    }

    // Handle node click to show details
    function nodeClicked(event, d) {
        // Prevent event bubbling
        event.stopPropagation();

        // Deselect current node if it's the same one
        if (app.state.selectedNode === d.name) {
            app.state.selectedNode = null;
            app.elements.nodeDetails.classList.add('d-none');
            return;
        }

        // Clear selected edge if any
        app.state.selectedEdge = null;

        // Update selected node
        app.state.selectedNode = d.name;

        // Show the details panel
        app.elements.nodeDetails.classList.remove('d-none');
        app.elements.nodeDetailsTitle.textContent = d.name || "Node Details";

        // Apply colors to the details panel header
        const headerEl = app.elements.nodeDetails.querySelector('.card-header');
        if (headerEl) {
            headerEl.style.backgroundColor = d.color;
            headerEl.style.color = getTextColor(d.color);
        }

        // Format node details using the utility function
        app.elements.nodeDetailsContent.innerHTML = window.SchGraphApp.utils.formatNodeDetails(d);
    }

    // Handle edge click to show details
    function edgeClicked(event, d) {
        // Prevent event bubbling
        event.stopPropagation();

        // Deselect current edge if it's the same one
        if (app.state.selectedEdge === d) {
            app.state.selectedEdge = null;
            app.elements.nodeDetails.classList.add('d-none');
            return;
        }

        // Clear selected node if any
        app.state.selectedNode = null;

        // Update selected edge
        app.state.selectedEdge = d;

        // Show the details panel
        app.elements.nodeDetails.classList.remove('d-none');
        app.elements.nodeDetailsTitle.textContent = d.name || "Edge Details";

        // Format edge details using the utility function
        app.elements.nodeDetailsContent.innerHTML = window.SchGraphApp.utils.formatEdgeDetails(d);
    }

    // Drag functions for nodes
    function dragStarted(event, d) {
        // Hide tooltip immediately when starting to drag
        hideTooltip();

        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragEnded(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        if (!app.state.physicsEnabled) {
            d.fx = event.x;
            d.fy = event.y;
        } else {
            d.fx = null;
            d.fy = null;
        }
    }

    // Reset zoom function - FIXED VERSION
    function resetZoom() {
        console.log('Resetting zoom'); // Debug log
        if (svg && zoom) {
            svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
        } else {
            console.error('svg or zoom not defined');
        }
    }

    // Toggle physics simulation
    function togglePhysics(enabled) {
        if (enabled) {
            // Release fixed positions
            if (node) {
                node.each(d => {
                    d.fx = null;
                    d.fy = null;
                });
                simulation.alpha(0.3).restart();
            }
        } else {
            // Fix nodes in current positions
            if (node) {
                node.each(d => {
                    d.fx = d.x;
                    d.fy = d.y;
                });
            }
        }
    }

    function updateForces(forces) {
    if (!simulation) return;

    // Update charge force
    if (forces.charge !== undefined) {
        simulation.force("charge")
            .strength(forces.charge);
    }

    // Update link distance
    if (forces.linkDistance !== undefined) {
        simulation.force("link")
            .distance(forces.linkDistance);
    }

    // Update collision strength
    if (forces.collisionStrength !== undefined) {
        simulation.force("collide")
            .strength(forces.collisionStrength);
    }

    // Use a smaller alpha for smoother transitions during slider changes
    simulation.alpha(0.1).restart();
}

    // Return public API
    return {
        updateGraph,
        resetZoom,
        togglePhysics,
        updateForces,
        toggleTreeLayout: function() {
        useTreeLayout = !useTreeLayout;
        if (app.state.currentGraph) {
            updateGraph(app.state.currentGraph);
        }
        return useTreeLayout;
    }
    };
}