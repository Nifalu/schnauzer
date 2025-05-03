// graph.js - Core graph visualization functionality
// Handles the D3.js SVG setup and rendering

function initializeVisualization() {
    const app = window.SchGraphApp;
    const width = app.elements.graphContainer.clientWidth;
    const height = app.elements.graphContainer.clientHeight;

    // Create SVG container
    const svg = d3.select("#graph-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Create a group for the graph that can be transformed
    const g = svg.append("g");

    // Set up zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);

    // Create marker for arrow
    svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "-0 -5 10 10")
        .attr("refX", 32)
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

    // Graph visualization components
    let simulation = null;
    let link = null;
    let node = null;

    // Add mouse event listeners to track mouse state
    svg.on("mousedown", function() {
        app.state.isMouseDown = true;

        // Clear any pending tooltip
        if (app.state.tooltipTimeout) {
            clearTimeout(app.state.tooltipTimeout);
            app.state.tooltipTimeout = null;
        }

        // Hide any visible tooltip immediately
        tooltip.transition().duration(0).style("opacity", 0);
    });

    svg.on("mouseup", function() {
        app.state.isMouseDown = false;
    });

    // Ensure mouse up is detected even if released outside the SVG
    document.addEventListener("mouseup", function() {
        app.state.isMouseDown = false;
    });

    // Render a graph from data
    function updateGraph(graph) {
        // Ensure graph has nodes and links arrays
        if (!graph.nodes) graph.nodes = [];
        if (!graph.links) graph.links = [];

        // Clear existing graph elements
        g.selectAll(".node").remove();
        g.selectAll(".link").remove();

        // Set up force simulation
        simulation = d3.forceSimulation(graph.nodes)
            .force("link", d3.forceLink(graph.links)
                .id(d => d.id)
                .distance(200))
            .force("charge", d3.forceManyBody().strength(-800))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(60))
            .force("x", d3.forceX(width / 2).strength(0.1))
            .force("y", d3.forceY(height / 2).strength(0.1));

        // Create links
        link = g.selectAll(".link")
            .data(graph.links)
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

        // Add square nodes with text wrapping
        node.append("rect")
            .attr("width", d => Math.max(100, d.label ? d.label.length * 8 : 100))
            .attr("height", 60)
            .attr("x", d => -Math.max(100, d.label ? d.label.length * 8 : 100) / 2)
            .attr("y", -30)
            .attr("rx", 6)
            .attr("ry", 6)
            .attr("fill", d => {
                if (d.category === 'A') return "#ff7f0e";
                if (d.category === 'B') return "#1f77b4";
                if (d.category === 'C') return "#2ca02c";
                return "#9467bd";
            })
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

        // Add text with wrapping
        node.each(function(d) {
            const label = d.label || d.id || "Unknown";
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

        // Add tooltip events
        node.on("mouseover", function(event, d) {
            // Don't show tooltip if mouse is pressed (during dragging or clicking)
            if (app.state.isMouseDown) return;

            // Clear any existing timeout
            if (app.state.tooltipTimeout) clearTimeout(app.state.tooltipTimeout);

            // Set a timeout to show the tooltip after a delay
            app.state.tooltipTimeout = setTimeout(() => {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);

                // Format the description for hover tooltip
                const description = d.description || "No description available";
                const formattedDescription = description.replace(/\n/g, '<br>');

                tooltip.html(`
                    <h4>${d.label || d.id || "Unknown"}</h4>
                    <p><strong>Type:</strong> ${d.type || "Not specified"}</p>
                    <div>${formattedDescription}</div>
                `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 30) + "px");
            }, 500);
        })
        .on("mouseout", function() {
            // Clear the timeout if mouse leaves before the tooltip is shown
            if (app.state.tooltipTimeout) {
                clearTimeout(app.state.tooltipTimeout);
                app.state.tooltipTimeout = null;
            }

            // Hide the tooltip
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

        // Define tick function for simulation
        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

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
        app.elements.nodeDetailsTitle.textContent = d.label || d.id || "Node Details";

        // Format node details
        let detailsHTML = `
            <p><strong>ID:</strong> ${d.id}</p>
            <p><strong>Type:</strong> ${d.type || "Not specified"}</p>
            <p><strong>Category:</strong> ${d.category || "Not specified"}</p>
        `;

        if (d.description) {
            detailsHTML += `<hr><h6>Description</h6><div>${d.description.replace(/\n/g, '<br>')}</div>`;
        }

        app.elements.nodeDetailsContent.innerHTML = detailsHTML;
    }

    // Drag functions for nodes
    function dragStarted(event, d) {
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

    // Reset zoom function
    function resetZoom() {
        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
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