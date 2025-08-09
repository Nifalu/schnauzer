/**
 * graph.js - Cytoscape graph rendering
 * Only handles Cytoscape initialization and rendering
 */

export class Graph {
    constructor(state, ui) {
        this.state = state;
        this.ui = ui;
        this.cy = null;
    }

    init() {
        const container = this.ui.elements.graphContainer;
        if (!container) {
            console.error('Graph container not found');
            if (this.ui) {
                this.ui.showStatus('Error: Graph container not found', 'error');
            }
            return;
        }

        try {
            this.cy = cytoscape({
                container: container,
                style: this.getStyles(),
                minZoom: 0.1,
                maxZoom: 4,
                wheelSensitivity: 0.2
            });

            this.state.setCy(this.cy);
            return this.cy;
        } catch (error) {
            console.error('Failed to initialize Cytoscape:', error);
            if (this.ui) {
                this.ui.showStatus('Error: Failed to initialize graph', 'error');
            }
            return null;
        }
    }

    getStyles() {
        return [
            {
                selector: 'node',
                style: {
                    'background-color': 'data(color)',
                    'label': (ele) => this.formatLabel(ele.data('name')),
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'text-wrap': 'wrap',
                    'text-max-width': '100px',
                    'width': 'label',
                    'height': (ele) => {
                        const name = ele.data('name') || '';
                        return name.length > 12 ? 40 : 25;
                    },
                    'padding': 10,
                    'shape': 'roundrectangle',
                    'border-width': 1,
                    'border-color': '#fff',
                    'font-size': 14,
                    'color': (ele) => this.ui.getTextColor(ele.data('color') || '#999')
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': 'data(color)',
                    'target-arrow-color': 'data(color)',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'control-point-step-size': 20,
                    'label': (ele) => this.formatLabel(ele.data('name')),
                    'font-size': 10,
                    'text-rotation': 'autorotate',
                    'text-margin-y': -10
                }
            },
            {
                selector: ':selected',
                style: {
                    'border-width': 2,
                    'border-color': '#007bff'
                }
            },
            {
                selector: '.dimmed',
                style: { 'opacity': 0.2 }
            },
            {
                selector: '.highlighted',
                style: { 'opacity': 1, 'z-index': 999 }
            },
            {
                selector: '.trace-highlight',
                style: {
                    'border-width': 3,
                    'border-color': '#e74c3c',
                    'z-index': 1000
                }
            },
            {
                selector: 'edge.trace-highlight',
                style: {
                    'line-color': '#e74c3c',
                    'target-arrow-color': '#e74c3c',
                    'width': 5
                }
            },
            {
                selector: 'edge.trace-highlight-secondary',
                style: {
                    'line-color': '#e74c3c',
                    'target-arrow-color': '#e74c3c',
                    'width': 3,
                    'opacity': 0.4,
                    'z-index': 999
                }
            },
            {
                selector: '.hidden',
                style: {
                    'display': 'none'
                }
            }
        ];
    }

    render(data) {
        if (!this.cy) {
            console.error('Cannot render: Cytoscape not initialized');
            if (this.ui) {
                this.ui.showStatus('Error: Graph not initialized', 'error');
            }
            return;
        }

        if (!data || !data.elements) {
            console.error('Cannot render: invalid data structure');
            if (this.ui) {
                this.ui.showStatus('Error: Invalid graph data received', 'error');
            }
            return;
        }

        // Clear existing elements
        this.cy.elements().remove();

        // Check if we have any elements to add
        const hasNodes = data.elements.nodes && data.elements.nodes.length > 0;
        const hasEdges = data.elements.edges && data.elements.edges.length > 0;

        if (!hasNodes && !hasEdges) {
            // Empty graph - this is OK, not an error
            console.log('Rendering empty graph');
            return;
        }

        // Add new elements
        try {
            this.cy.add(data.elements);

            // Center nodes initially
            const centerX = (window.innerWidth - 300) / 2;
            const centerY = window.innerHeight / 2;
            this.cy.nodes().positions({ x: centerX, y: centerY });

            // Run default layout
            this.runLayout('fcose');
        } catch (error) {
            console.error('Error rendering graph:', error);
            if (this.ui) {
                this.ui.showStatus('Error: Failed to render graph data', 'error');
            }
        }
    }

    runLayout(layoutName, options = {}) {
        if (!this.cy) return;

        const layout = this.cy.layout({
            name: layoutName,
            animate: true,
            animationDuration: 1000,
            fit: true,
            padding: 50,
            ...options
        });

        layout.run();
        return layout;
    }

    formatLabel(name) {
        if (!name || name.length <= 16) return name || '';

        let processedName = name.length > 32 ? name.substring(0, 32) : name;
        const midPoint = Math.floor(processedName.length / 2);

        // Try to find a good break point
        for (let i = midPoint; i >= Math.max(0, midPoint - 8); i--) {
            if (processedName[i] === ' ' || processedName[i] === '-' || processedName[i] === '_') {
                return processedName.substring(0, i) + '\n' + processedName.substring(i + 1);
            }
        }

        return processedName.substring(0, midPoint) + '\n' + processedName.substring(midPoint);
    }

    resetZoom() {
        if (!this.cy) return;
        this.cy.fit(null, 50);
    }

    exportAsPNG() {
        if (!this.cy) return;

        const blob = this.cy.png({
            output: 'blob',
            bg: '#f9f9f9',
            scale: 2
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = `graph-${Date.now()}.png`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}