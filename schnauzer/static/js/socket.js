/**
 * socket.js - Socket.IO communication
 * Handles all server communication
 */

export class Socket {
    constructor(state, onGraphUpdate, ui) {
        this.state = state;
        this.onGraphUpdate = onGraphUpdate;
        this.ui = ui;
        this.socket = null;
    }

    connect() {
        return new Promise((resolve) => {
            this.socket = io({
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                forceNew: true,
                timeout: 20000
            });

            this.state.set('socket', this.socket);

            // Set up event handlers
            this.socket.on('connect', () => {
                this.state.set('connected', true);
                console.log('Connected to server');
                if (this.ui) {
                    this.ui.showStatus('Connected to server', 'success', 2000);
                }
                resolve();
            });

            this.socket.on('disconnect', () => {
                this.state.set('connected', false);
                console.log('Disconnected from server');
                if (this.ui) {
                    this.ui.showStatus('Disconnected from server. Trying to reconnect...', 'warning');
                }
            });

            this.socket.on('graph_update', (data) => {
                console.log('Received graph update');

                // Check what kind of update we received
                if (!data || !data.elements) {
                    // Invalid data structure
                    console.error('Received invalid graph data');
                    if (this.ui) {
                        this.ui.showStatus('Error: Received invalid graph data', 'error', 5000);
                    }
                    return;
                }

                const isEmpty = this.isEmptyGraph(data);

                this.onGraphUpdate(data);

                if (this.ui) {
                    if (isEmpty) {
                        this.ui.showStatus('Graph cleared', 'info', 3000);
                    } else {
                        const nodeCount = data.elements.nodes?.length || 0;
                        const edgeCount = data.elements.edges?.length || 0;
                        this.ui.showStatus(`Graph updated: ${nodeCount} nodes, ${edgeCount} edges`, 'success', 3000);
                    }
                }
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                if (this.ui) {
                    this.ui.showStatus('Connection error: ' + error.message, 'error', 3000);
                }
            });

            // Resolve after a short delay even if not connected
            setTimeout(resolve, 500);
        });
    }

    async loadInitialData() {
        if (this.ui) {
            this.ui.showStatus('Checking for graph data...', 'info');
        }

        try {
            const response = await fetch('/graph-data');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            // Check if this is an empty/default graph
            if (this.isEmptyGraph(data)) {
                if (this.ui) {
                    this.ui.showStatus('Waiting for graph data...', 'info', 5000);
                }
                // Still call onGraphUpdate to initialize empty state
                this.onGraphUpdate(data);
            } else {
                // We have actual graph data
                this.onGraphUpdate(data);
                if (this.ui) {
                    this.ui.showStatus('Graph loaded successfully', 'success', 3000);
                }
            }

            return data;

        } catch (error) {
            console.error('Error loading initial data:', error);
            if (this.ui) {
                this.ui.showStatus('Failed to connect to server. Retrying...', 'error', 5000);
            }
            // Retry after 5 seconds
            setTimeout(() => this.loadInitialData(), 5000);
            throw error;
        }
    }

    isEmptyGraph(data) {
        // Check if this is the default empty graph
        if (!data || !data.elements) return true;

        const hasNodes = data.elements.nodes && data.elements.nodes.length > 0;
        const hasEdges = data.elements.edges && data.elements.edges.length > 0;

        // If we have neither nodes nor edges, it's empty
        return !hasNodes && !hasEdges;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.state.set('socket', null);
            this.state.set('connected', false);
        }
    }
}