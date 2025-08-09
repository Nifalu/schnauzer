/**
 * graph.js - Cytoscape graph rendering
 * Handles graph initialization, rendering, layouts, and viewport management
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

    getSmartLayoutOptions(layoutName) {
        const viewport = this.getAdjustedViewport();
        const nodeCount = this.cy?.nodes().length || 0;
        const edgeCount = this.cy?.edges().length || 0;

        // Base options
        const baseOptions = {
            name: layoutName,
            animate: true,
            animationDuration: 1000,
            fit: false,
            boundingBox: viewport
        };

        // Calculate graph properties
        const avgDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;
        const isSimpleGraph = avgDegree < 3; // Tree-like or simple

        // Estimate depth for hierarchical layouts
        let estimatedDepth = Math.ceil(Math.sqrt(nodeCount));
        if (this.cy && (layoutName === 'dagre' || layoutName === 'breadthfirst')) {
            // Find root nodes (no incoming edges)
            const roots = this.cy.nodes().filter(n => n.indegree() === 0);
            if (roots.length > 0) {
                // Quick depth estimation: assume balanced tree
                estimatedDepth = Math.ceil(Math.log2(nodeCount / roots.length + 1));
            }
        }

        // Layout-specific smart parameters
        switch (layoutName) {
            case 'dagre':
                // SUPER COMPACT for small graphs
                // Your graph has 7 nodes - it should be tight!

                // Scale based on node count but keep it VERY compact
                let rankSep, nodeSep;

                if (nodeCount <= 10) {
                    // VERY tight for small graphs
                    rankSep = 20;  // Minimal vertical spacing
                    nodeSep = 8;   // Minimal horizontal spacing
                } else if (nodeCount <= 30) {
                    // Still tight for medium graphs
                    rankSep = 30;
                    nodeSep = 12;
                } else {
                    // Slightly more space for large graphs
                    rankSep = 40;
                    nodeSep = 15;
                }

                return {
                    ...baseOptions,
                    rankDir: 'TB',
                    rankSep: rankSep,
                    nodeSep: nodeSep,
                    edgeSep: 3,  // Very tight edge separation
                    ranker: 'tight-tree',
                    align: 'UL'  // Up-left for maximum compactness
                };

            case 'breadthfirst':
                return {
                    ...baseOptions,
                    directed: true,
                    // Even tighter spacing for simple graphs
                    spacingFactor: isSimpleGraph ? 0.6 : 1.0,  // Reduced from 0.75/1.25
                    avoidOverlap: true,
                    grid: false,
                    maximal: false
                };

            case 'fcose':
                return {
                    ...baseOptions,
                    idealEdgeLength: isSimpleGraph ? 100 : 200,
                    nodeOverlap: 1,
                    nodeRepulsion: isSimpleGraph ? 1000 : 2000,
                    numIter: 2500,
                    tile: true,
                    tilingPaddingVertical: 10,
                    tilingPaddingHorizontal: 10,
                    randomize: true,
                    quality: 'default'
                };

            case 'circle':
                const viewportWidth = viewport.x2 - viewport.x1;
                const viewportHeight = viewport.y2 - viewport.y1;
                const minDimension = Math.min(viewportWidth, viewportHeight);

                // Calculate optimal radius based on node count
                // More nodes = need bigger circle
                const nodeSpacing = 80; // Desired spacing between nodes
                const circumference = nodeCount * nodeSpacing;
                const calculatedRadius = circumference / (2 * Math.PI);

                // Constrain to viewport
                const radius = Math.min(
                    minDimension * 0.4,  // Max 40% of viewport
                    Math.max(calculatedRadius, 50)  // At least calculated or 50px
                );

                return {
                    ...baseOptions,
                    name: 'circle',
                    radius: radius,
                    // Don't specify sweep - let Cytoscape handle even distribution
                    // This should automatically prevent overlap
                    avoidOverlap: true,
                    avoidOverlapPadding: 20,
                    clockwise: true
                };

            case 'concentric':
                return {
                    ...baseOptions,
                    minNodeSpacing: 50,  // Reduced from 80
                    levelWidth: () => 2,
                    concentric: (node) => node.degree(),
                    startAngle: 0,
                    sweep: 2 * Math.PI,
                    clockwise: true,
                    avoidOverlap: true,
                    avoidOverlapPadding: 10
                };

            case 'grid':
                return {
                    ...baseOptions,
                    avoidOverlap: true,
                    avoidOverlapPadding: 10,
                    condense: true,  // Changed to true for more compact grid
                    rows: undefined,  // Let Cytoscape determine
                    cols: undefined   // Let Cytoscape determine
                };

            default:
                return baseOptions;
        }
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

        // Get smart layout options
        const smartOptions = this.getSmartLayoutOptions(layoutName);

        // Merge with any provided options
        const layoutOptions = {
            ...smartOptions,
            ...options
        };

        const layout = this.cy.layout(layoutOptions);

        // Fit after layout completes
        layout.on('layoutstop', () => {
            setTimeout(() => {
                this.ensureGraphVisible();
            }, 100);
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