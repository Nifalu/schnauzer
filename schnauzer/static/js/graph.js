// NetworkX DiGraph Visualization with D3.js and SocketIO

// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // SocketIO connection with reconnection options
    const socket = io({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        forceNew: true,           // Force a new connection
        timeout: 20000            // Increase timeout
    });

    // Constants and variables
    const width = document.getElementById('graph-container').clientWidth;
    const height = document.getElementById('graph-container').clientHeight;
    let physicsEnabled = true;
    let simulation = null;
    let link = null;
    let node = null;
    let currentGraph = null;
    let selectedNode = null;
    let tooltipTimeout = null;
    let isMouseDown = false;

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
        .attr("refX", 32) // Increased to account for larger squares
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

    // Load graph data with retry mechanism
    function loadGraphData() {
        fetch('/graph-data')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(graph => {
                currentGraph = graph;

                // Update page title if provided in graph data
                if (graph.title) {
                    document.title = graph.title;
                    // Update the header if it exists
                    const header = document.querySelector('h1.text-center');
                    if (header) {
                        header.textContent = graph.title;
                    }
                }

                initializeGraph(graph);
            })
            .catch(error => {
                console.error('Error loading graph data:', error);
                showStatus('Failed to load graph data. Retrying in 5 seconds...', 'error');
                // Retry after 5 seconds
                setTimeout(loadGraphData, 5000);
            });
    }

    // Initial graph load
    loadGraphData();

    // Initialize the graph visualization
    function initializeGraph(graph) {
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
                .distance(200)) // Increased for better spacing with larger nodes
            .force("charge", d3.forceManyBody().strength(-800))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(60)) // Increased collision radius
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
            .on("click", nodeClicked); // Add click handler

        // Add square nodes with text wrapping
        node.append("rect")
            .attr("width", d => Math.max(100, d.label ? d.label.length * 8 : 100)) // Dynamic width based on text length
            .attr("height", 60) // Fixed height
            .attr("x", d => -Math.max(100, d.label ? d.label.length * 8 : 100) / 2) // Center horizontally
            .attr("y", -30) // Center vertically
            .attr("rx", 6) // Rounded corners
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

        // Add mouse event listeners to track mouse state
        svg.on("mousedown", function() {
            isMouseDown = true;

            // Clear any pending tooltip
            if (tooltipTimeout) {
                clearTimeout(tooltipTimeout);
                tooltipTimeout = null;
            }

            // Hide any visible tooltip immediately
            tooltip.transition().duration(0).style("opacity", 0);
        });

        svg.on("mouseup", function() {
            isMouseDown = false;
        });

        // Add this to ensure mouse up is detected even if released outside the SVG
        document.addEventListener("mouseup", function() {
            isMouseDown = false;
        });

        // Add tooltip events
        node.on("mouseover", function(event, d) {
            // Don't show tooltip if mouse is pressed (during dragging or clicking)
            if (isMouseDown) return;

            // Clear any existing timeout
            if (tooltipTimeout) clearTimeout(tooltipTimeout);

            // Set a timeout to show the tooltip after a delay
            tooltipTimeout = setTimeout(() => {
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
            if (tooltipTimeout) {
                clearTimeout(tooltipTimeout);
                tooltipTimeout = null;
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