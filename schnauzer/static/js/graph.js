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

            // Setup window resize handler
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    if (this.cy && this.cy.nodes().length > 0) {
                        this.ensureGraphVisible();
                    }
                }, 250);
            });

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

    getAdjustedViewport() {
        const rightPanelWidth = 300;
        const topOffset = 80;
        const bottomOffset = 80;
        const leftOffset = 20;

        return {
            x1: leftOffset,
            y1: topOffset,
            x2: window.innerWidth - rightPanelWidth - 20,
            y2: window.innerHeight - bottomOffset
        };
    }

    ensureGraphVisible() {
        if (!this.cy || this.cy.nodes().length === 0) return;

        const bb = this.cy.elements().boundingBox();
        const viewport = this.getAdjustedViewport();

        const viewportWidth = viewport.x2 - viewport.x1;
        const viewportHeight = viewport.y2 - viewport.y1;

        const padding = 0.9;
        const zoomX = (viewportWidth / bb.w) * padding;
        const zoomY = (viewportHeight / bb.h) * padding;
        let targetZoom = Math.min(zoomX, zoomY, 2.0);
        targetZoom = Math.max(targetZoom, 0.1);

        const bbCenterX = (bb.x1 + bb.x2) / 2;
        const bbCenterY = (bb.y1 + bb.y2) / 2;
        const viewportCenterX = (viewport.x1 + viewport.x2) / 2;
        const viewportCenterY = (viewport.y1 + viewport.y2) / 2;

        const targetPan = {
            x: viewportCenterX - bbCenterX * targetZoom,
            y: viewportCenterY - bbCenterY * targetZoom
        };

        this.cy.animate({
            zoom: targetZoom,
            pan: targetPan,
            duration: 500,
            easing: 'ease-in-out'
        });
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
            console.log('Rendering empty graph');
            return;
        }

        // Add new elements
        try {
            this.cy.add(data.elements);

            // Run default layout with auto-fit
            this.runLayoutWithFit('fcose');
        } catch (error) {
            console.error('Error rendering graph:', error);
            if (this.ui) {
                this.ui.showStatus('Error: Failed to render graph data', 'error');
            }
        }
    }

    runLayoutWithFit(layoutName, options = {}) {
        if (!this.cy) return;

        const viewport = this.getAdjustedViewport();

        const layoutOptions = {
            name: layoutName,
            animate: true,
            animationDuration: 1000,
            fit: false, // We'll fit manually after layout
            boundingBox: viewport,
            ...options
        };

        const layout = this.cy.layout(layoutOptions);

        // Set up layout stop handler to fit graph
        layout.on('layoutstop', () => {
            setTimeout(() => {
                this.ensureGraphVisible();
            }, 100);
        });

        layout.run();
        return layout;
    }

    runLayout(layoutName, options = {}) {
        // Delegate to runLayoutWithFit for consistent behavior
        return this.runLayoutWithFit(layoutName, options);
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
        this.ensureGraphVisible();
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