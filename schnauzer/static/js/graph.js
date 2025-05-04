// graph.js - Core graph visualization functionality
// Handles the D3.js SVG setup and rendering

function initializeVisualization() {
    const app = window.SchGraphApp;
    const width = app.elements.graphContainer.clientWidth;
    const height = app.elements.graphContainer.clientHeight;

    let svg, zoom, simulation, node, link;

    function getNodeDimensions(node) {
        return {
            width: Math.max(100, node.label ? node.label.length * 8 : 100),
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
        .attr("xoverflow", "visible")
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

    // Show tooltip function with minimal delay
    function showTooltip(event, d) {
        // Don't show tooltip if mouse is pressed (during dragging)
        if (app.state.isMouseDown) return;

        // Set current node
        currentTooltipNode = d;

        // Format the description for hover tooltip
        const description = d.description || "No description available";
        const formattedDescription = description.length > 150 ?
            description.substring(0, 147) + "..." :
            description;

        // Update tooltip content
        tooltip.html(`
            <h4>${d.name || d.id || "Unknown"}</h4>
            <p><strong>Type:</strong> ${d.type || "Not specified"}</p>
            <div>${formattedDescription.replace(/\n/g, '<br>')}</div>
        `);

        // Position the tooltip near the cursor but not directly under it
        // to prevent flickering when moving between elements
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
        g.selectAll(".link").remove();

        // Set up force simulation
        simulation = d3.forceSimulation(graph.nodes)
            .force("link", d3.forceLink(graph.edges)
                .id(d => d.id)
                .distance(200))
            .force("charge", d3.forceManyBody().strength(-1200))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(80))
            .force("x", d3.forceX(width / 2).strength(0.07))
            .force("y", d3.forceY(height / 2).strength(0.07));

        // Create links
        link = g.selectAll(".link")
            .data(graph.edges)
            .enter()
            .append("line")
            .attr("class", "link")
            .attr("stroke-width", 2)
            .attr("marker-end", "url(#arrowhead)");

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

        node.attr("id", d => `node-${d.id}`);

        // Add square nodes with text wrapping
        node.append("rect")
            .attr("width", d => getNodeDimensions(d).width)
            .attr("height", d => getNodeDimensions(d).height)
            .attr("x", d => -getNodeDimensions(d).width / 2)
            .attr("y", d => -getNodeDimensions(d).height / 2)
            .attr("rx", 6)
            .attr("ry", 6)
            .attr("fill", d => {
                // Color based on node type (root, normal, leaf)
                if (d.type === 'root') return "#b62c0e";  // Blue for root nodes
                if (d.type === 'leaf') return "#176c22";  // Green for leaf nodes
                return "#1734bd";  // Orange for normal nodes
            })
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

        // Add text with wrapping
        node.each(function(d) {
            const label = d.name || d.id || "Unknown";
            const nodeWidth = Math.max(100, label.length * 8) - 20; // Padding
            const text = d3.select(this).append("text")
                .attr("text-anchor", "middle")
                .attr("dy", -10)
                .attr("fill", "#fff")
                .attr("pointer-events", "none");

            // Simple text wrapping algorithm
            let words = label.split(/\s+/);
            let line = "";
            let lineNumber = 0;
            const lineHeight = 20;

            for (let i = 0; i < words.length; i++) {
                let testLine = line + words[i] + " ";
                if (testLine.length * 7 > nodeWidth) { // Approximate character width
                    // Add a new line
                    text.append("tspan")
                        .attr("x", 0)
                        .attr("y", 0)
                        .attr("dy", lineNumber * lineHeight)
                        .text(line);
                    line = words[i] + " ";
                    lineNumber++;
                } else {
                    line = testLine;
                }
            }

            // Add the last line
            text.append("tspan")
                .attr("x", 0)
                .attr("y", 0)
                .attr("dy", lineNumber * lineHeight)
                .text(line);
        });

        // Add tooltip events with improved responsiveness
        node.on("mouseover", function(event, d) {
            if (!app.state.isMouseDown) {
                showTooltip(event, d);
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

        // Update the simulation tick function to better handle edge cases
        simulation.on("tick", () => {
            link.each(function(d) {
                // Calculate direction vector between source and target
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;

                // Get target node dimensions
                const targetDimensions = getNodeDimensions(d.target);
                const padding = 12; // Padding before the node boundary

                // Calculate the distance to the rectangle intersection
                // More reliable approach using linear scaling
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Using normalized direction for consistent approach
                const unitDx = dx / distance;
                const unitDy = dy / distance;

                // Find intersection with rectangle using parametric approach
                let t = Infinity;
                const halfWidth = targetDimensions.width / 2;
                const halfHeight = targetDimensions.height / 2;

                // Check intersection with each edge of the rectangle
                if (unitDx !== 0) {
                    // Intersection with vertical edges
                    const tx1 = (-halfWidth - padding) / unitDx; // Left edge
                    const tx2 = (halfWidth + padding) / unitDx;  // Right edge
                    t = Math.min(t, Math.max(tx1, tx2));
                }

                if (unitDy !== 0) {
                    // Intersection with horizontal edges
                    const ty1 = (-halfHeight - padding) / unitDy; // Top edge
                    const ty2 = (halfHeight + padding) / unitDy;  // Bottom edge
                    t = Math.min(t, Math.max(ty1, ty2));
                }

                // Calculate target point
                const targetX = d.target.x - t * unitDx;
                const targetY = d.target.y - t * unitDy;

                // Set the line coordinates
                d3.select(this)
                    .attr("x1", d.source.x)
                    .attr("y1", d.source.y)
                    .attr("x2", targetX)
                    .attr("y2", targetY);
            });

            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });
    }

    // Handle node click to show details
    function nodeClicked(event, d) {
        // Prevent event bubbling
        event.stopPropagation();

        // Deselect current node if it's the same one
        if (app.state.selectedNode === d.id) {
            app.state.selectedNode = null;
            app.elements.nodeDetails.classList.add('d-none');
            return;
        }

        // Update selected node
        app.state.selectedNode = d.id;

        // Show the details panel
        app.elements.nodeDetails.classList.remove('d-none');
        app.elements.nodeDetailsTitle.textContent = d.name || d.id || "Node Details";

        // Format node details using the utility function
        app.elements.nodeDetailsContent.innerHTML = formatNodeDetails(d);
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

    // Return public API
    return {
        updateGraph,
        resetZoom,
        togglePhysics
    };
}