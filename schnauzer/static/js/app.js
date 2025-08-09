/**
 * app.js - Application orchestrator
 * Just wires everything together, no logic
 */

import { State } from './state.js';
import { Graph } from './graph.js';
import { LayoutManager } from './layouts.js';
import { InteractionHandler } from './interactions.js';
import { Search } from './search.js';
import { Trace } from './trace.js';
import { Filter } from './filter.js';
import { Socket } from './socket.js';
import { UI } from './ui.js';

class App {
    constructor() {
        // Initialize all modules
        this.state = new State();
        this.ui = new UI(this.state);
        this.graph = new Graph(this.state, this.ui);
        this.layouts = new LayoutManager(this.state, this.graph);
        this.interactions = new InteractionHandler(this.state, this.ui, this.graph);
        this.search = new Search(this.state, this.graph);
        this.trace = new Trace(this.state, this.graph, this.ui);
        this.filter = new Filter(this.state, this.graph);
        this.socket = new Socket(this.state, this.handleGraphUpdate.bind(this));
    }

    async init() {
        console.log('Initializing Schnauzer...');

        // Initialize UI elements
        this.ui.init();

        // Initialize graph
        this.graph.init();

        // Set up interactions
        this.interactions.init();

        // Connect socket and load data
        await this.socket.connect();
        await this.socket.loadInitialData();
    }

    handleGraphUpdate(data) {
        this.state.setGraphData(data);
        this.graph.render(data);
        this.ui.updateStats(data);
        this.ui.updateTitle(data.title);
        this.search.reset();
        this.trace.reset();
        this.filter.reset();
    }
}

// Start the app
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());

export { app };