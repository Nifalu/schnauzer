// main.js - Main application initialization and socket handling
// This file handles socket connection, global state, and initializes the application

// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize app namespace to avoid global variables
    window.SchGraphApp = window.SchGraphApp || {};
    const app = window.SchGraphApp;

    // Global state variables
    app.state = {
        physicsEnabled: true,
        currentGraph: null,
        selectedNode: null,
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
        togglePhysicsBtn: document.getElementById('toggle-physics'),
        requestUpdateBtn: document.getElementById('request-update'),
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

        app.socket.on('graph_update', function(graphData) {
            app.state.currentGraph = graphData;
            app.viz.updateGraph(graphData);
            updateGraphStats(graphData);
            showStatus('Graph updated', 'success', 3000);
        });

        app.socket.on('connect_error', function(error) {
            showStatus('Connection error: ' + error, 'error');
        });
    }

    // UI Button handlers
    function setupUIEventListeners() {
        // reset zoom button
        app.elements.resetZoomBtn.addEventListener('click', function() {
            console.log('Reset zoom button clicked'); // Debug log
            if (app.viz && app.viz.resetZoom) {
                app.viz.resetZoom();
            } else {
                console.error('resetZoom function not found');
            }
        });

        // Toggle physics button
        app.elements.togglePhysicsBtn.addEventListener('click', function() {
            app.state.physicsEnabled = !app.state.physicsEnabled;
            this.textContent = app.state.physicsEnabled ? 'Freeze Nodes' : 'Enable Physics';
            app.viz.togglePhysics(app.state.physicsEnabled);
        });

        // Toggle Tree view
        document.getElementById('toggle-layout').addEventListener('click', function() {
            const isTree = app.viz.toggleTreeLayout();
            this.textContent = isTree ? 'Force Layout' : 'Tree Layout';
            this.classList.toggle('btn-outline-primary');
            this.classList.toggle('btn-primary');
        });

        // export button
        const exportBtn = document.getElementById('export-graph');
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                console.log('Export button clicked'); // Debug log
                // Use the proper exportGraphAsPNG function from utils
                if (window.SchGraphApp.utils && window.SchGraphApp.utils.exportGraphAsPNG) {
                    window.SchGraphApp.utils.exportGraphAsPNG();
                } else {
                    // Fallback to local implementation if needed
                    exportGraphAsPNG();
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
                    // Trigger the input event to clear search
                    searchBox.dispatchEvent(new Event('input'));
                }
            });
        }
    }

    // Update graph statistics display
    function updateGraphStats(graphData) {
        if (!graphData) return;

        // Update node count
        const nodeCount = graphData.nodes ? graphData.nodes.length : 0;
        if (app.elements.nodeCountEl) {
            app.elements.nodeCountEl.textContent = nodeCount;
        }

        // Update edge/link count
        const edgeCount = graphData.edges ? graphData.edges.length : 0;
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
});