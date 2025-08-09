/**
 * socket.js - Socket.IO communication
 * Handles all server communication
 */

export class Socket {
    constructor(state, onGraphUpdate) {
        this.state = state;
        this.onGraphUpdate = onGraphUpdate;
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
                resolve();
            });

            this.socket.on('disconnect', () => {
                this.state.set('connected', false);
                console.log('Disconnected from server');
            });

            this.socket.on('graph_update', (data) => {
                console.log('Received graph update');
                this.onGraphUpdate(data);
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
            });

            // Resolve after a short delay even if not connected
            setTimeout(resolve, 500);
        });
    }

    async loadInitialData() {
        try {
            const response = await fetch('/graph-data');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            this.onGraphUpdate(data);
            return data;

        } catch (error) {
            console.error('Error loading initial data:', error);
            // Retry after 5 seconds
            setTimeout(() => this.loadInitialData(), 5000);
            throw error;
        }
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