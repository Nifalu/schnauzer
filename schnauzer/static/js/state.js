/**
 * state.js - Centralized state management
 * Single source of truth for application state
 */

export class State {
    constructor() {
        this.data = {
            // Graph data
            graphData: null,
            cy: null,  // Cytoscape instance reference
            traces: null,

            // UI state
            selectedNode: null,
            selectedEdge: null,
            layout: 'fcose',

            // Search state
            searchTerm: '',
            searchResults: [],

            // Trace state
            traceAttribute: null,
            showOrigins: false,
            currentPathIndex: 0,
            currentPaths: [],

            // Connection state
            socket: null,
            connected: false
        };

        // Event listeners for state changes
        this.listeners = {};
    }

    // Generic getter
    get(key) {
        return this.data[key];
    }

    // Generic setter with change notification
    set(key, value) {
        const oldValue = this.data[key];
        this.data[key] = value;
        this.notify(key, value, oldValue);
    }

    // Specific setters for complex state
    setGraphData(data) {
        this.data.graphData = data;
        this.data.traces = data.traces || null;
        this.notify('graphData', data);
    }

    setCy(cy) {
        this.data.cy = cy;
    }

    setSelectedNode(nodeId) {
        this.data.selectedNode = nodeId;
        this.data.selectedEdge = null;
        this.notify('selection', { node: nodeId, edge: null });
    }

    setSelectedEdge(edgeId) {
        this.data.selectedEdge = edgeId;
        this.data.selectedNode = null;
        this.notify('selection', { node: null, edge: edgeId });
    }

    clearSelection() {
        this.data.selectedNode = null;
        this.data.selectedEdge = null;
        this.notify('selection', { node: null, edge: null });
    }

    // Event system for state changes
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    notify(event, value, oldValue) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                callback(value, oldValue);
            });
        }
    }
}