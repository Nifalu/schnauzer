// main.js - Main application initialization and socket handling for Cytoscape version
// This file handles socket connection, global state, and initializes the application

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already loaded, initialize immediately
    initializeApp();
}

function initializeApp() {
    console.log("Initializing app");
    // Initialize app namespace to avoid global variables
    window.SchGraphApp = window.SchGraphApp || {};
    const app = window.SchGraphApp;

    // Global state variables
    app.state = {
        currentGraph: null,
        selectedNode: null,
        selectedEdge: null,
        tooltipTimeout: null,
        isMouseDown: false
    };

    // DOM elements cache
    app.elements = {
        graphContainer: document.getElementById('graph-container'),
        statusMessage: document.getElementById('status-message'),
        nodeDetails: document.getElementById('node-details'),
        nodeDetailsTitle: document.getElementById('node-details-title'),
        nodeDetailsContent: document.getElementById('node-details-content'),
        resetZoomBtn: document.getElementById('reset-zoom'),
        nodeCountEl: document.getElementById('node-count'),
        edgeCountEl: document.getElementById('edge-count')
    };

    // SocketIO connection with reconnection options
    app.socket = io({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        forceNew: true,
        timeout: 20000
    });

    // Set up socket event handlers
    setupSocketHandlers();

    // Initialize the visualization
    app.viz = initializeVisualization();

    // Attach event listeners to UI elements
    setupUIEventListeners();

    // Initial graph load
    loadGraphData();

    // Socket.IO event handlers
    function setupSocketHandlers() {
        app.socket.on('connect', function() {
            showStatus('Connected to server', 'success');
        });

        app.socket.on('disconnect', function() {
            showStatus('Disconnected from server. Trying to reconnect...', 'warning');
        });

        app.socket.on('graph_update', function(gdata) {
            if (app.viz && app.viz.stopCurrentLayout) {
                app.viz.stopCurrentLayout();
            }
            app.state.currentGraph = gdata;
            app.viz.updateGraph(gdata);
            updateGraphStats(gdata);
            document.title = gdata.title;
            const header = document.querySelector('h1.text-center');
            if (header) {
                header.textContent = gdata.title;
            }
            showStatus('Graph updated', 'success', 3000);
        });

        app.socket.on('connect_error', function(error) {
            showStatus('Connection error: ' + error, 'error');
        });
    }

    // UI Button handlers
    function setupUIEventListeners() {
        // Reset zoom button
        app.elements.resetZoomBtn.addEventListener('click', function() {
            if (app.viz && app.viz.resetZoom) {
                app.viz.resetZoom();
            }
        });

        // Layout dropdown handlers
        const layoutOptions = document.querySelectorAll('.layout-option');
        layoutOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                const layoutName = this.getAttribute('data-layout');

                // Set the new layout
                if (app.viz && app.viz.setLayout) {
                    app.viz.setLayout(layoutName);

                    // Update active state in dropdown
                    layoutOptions.forEach(opt => opt.classList.remove('active'));
                    this.classList.add('active');

                    if (app.ui && app.ui.updateControlPanelVisibility) {
                        app.ui.updateControlPanelVisibility(layoutName);
}
                }
            });
        });

        // Export button
        const exportBtn = document.getElementById('export-graph');
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                if (app.viz && app.viz.exportAsPNG) {
                    app.viz.exportAsPNG();
                } else if (window.SchGraphApp.utils && window.SchGraphApp.utils.exportGraphAsPNG) {
                    window.SchGraphApp.utils.exportGraphAsPNG();
                }
            });
        }

        // Clear search button
        const clearSearchBtn = document.getElementById('clear-search');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', function() {
                const searchBox = document.getElementById('search-nodes');
                if (searchBox) {
                    searchBox.value = '';
                    searchBox.dispatchEvent(new Event('input'));
                }
            });
        }
    }

    // Update graph statistics display
    function updateGraphStats(graphData) {
        if (!graphData) return;

        // Update node count
        let nodeCount = 0;
        if (graphData.elements?.nodes) {
            nodeCount = graphData.elements.nodes.length;
        } else if (graphData.nodes) {
            nodeCount = graphData.nodes.length;
        }

        if (app.elements.nodeCountEl) {
            app.elements.nodeCountEl.textContent = nodeCount;
        }

        // Update edge/link count
        let edgeCount = 0;
        if (graphData.elements?.edges) {
            edgeCount = graphData.elements.edges.length;
        } else if (graphData.edges) {
            edgeCount = graphData.edges.length;
        }

        if (app.elements.edgeCountEl) {
            app.elements.edgeCountEl.textContent = edgeCount;
        }
    }

    // Load graph data with retry mechanism
    function loadGraphData() {
        showStatus('Loading graph data...', 'info');

        fetch('/graph-data')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(graph => {
                app.state.currentGraph = graph;

                // Update page title if provided in graph data
                if (graph.title) {
                    document.title = graph.title;
                    // Update the header if it exists
                    const header = document.querySelector('h1.text-center');
                    if (header) {
                        header.textContent = graph.title;
                    }
                }

                app.viz.updateGraph(graph);
                updateGraphStats(graph);
                showStatus('Graph loaded successfully', 'success', 3000);
            })
            .catch(error => {
                console.error('Error loading graph data:', error);
                showStatus('Failed to load graph data. Retrying in 5 seconds...', 'error');
                // Retry after 5 seconds
                setTimeout(loadGraphData, 5000);
            });
    }

    const fcoseOption = document.querySelector('.layout-option[data-layout="fcose"]');
    if (fcoseOption) {
        fcoseOption.classList.add('active');
    }

    // Show status message with optional auto-hide
    function showStatus(message, type, duration = 0) {
        const statusEl = app.elements.statusMessage;

        // Set message and show
        statusEl.textContent = message;
        statusEl.className = `alert alert-${type} status-message`;
        statusEl.classList.remove('d-none');

        // Auto-hide after duration if specified
        if (duration > 0) {
            setTimeout(() => {
                statusEl.classList.add('d-none');
            }, duration);
        }
    }
};