// Add these functions to schnauzer/static/js/utils.js
// Add them after the existing utility functions (after line 140 or so)

/**
 * Calculate viewport boundaries accounting for UI panels
 * @returns {Object} Viewport boundaries {x1, y1, x2, y2}
 */
function getAdjustedViewport() {
    const rightPanelWidth = 300;  // Width of right panels
    const topOffset = 80;          // Space for top title
    const bottomOffset = 80;       // Space for bottom controls
    const leftOffset = 20;         // Small left margin

    return {
        x1: leftOffset,
        y1: topOffset,
        x2: window.innerWidth - rightPanelWidth - 20,
        y2: window.innerHeight - bottomOffset
    };
}

/**
 * Fit graph to viewport with proper centering
 * Centers the graph in the available space (accounting for right panels)
 * @param {Object} cy - Cytoscape instance
 */
function ensureGraphVisible(cy) {
    if (!cy || cy.nodes().length === 0) return;

    // Get the bounding box of all elements
    const bb = cy.elements().boundingBox();

    // Get adjusted viewport
    const viewport = getAdjustedViewport();

    // Calculate viewport dimensions
    const viewportWidth = viewport.x2 - viewport.x1;
    const viewportHeight = viewport.y2 - viewport.y1;

    // Add padding (90% of available space)
    const padding = 0.9;

    // Calculate required zoom
    const zoomX = (viewportWidth / bb.w) * padding;
    const zoomY = (viewportHeight / bb.h) * padding;
    let targetZoom = Math.min(zoomX, zoomY);

    // Clamp zoom to reasonable limits
    targetZoom = Math.min(targetZoom, 2.0);  // Max zoom in
    targetZoom = Math.max(targetZoom, 0.1);  // Max zoom out

    // Calculate centers
    const bbCenterX = (bb.x1 + bb.x2) / 2;
    const bbCenterY = (bb.y1 + bb.y2) / 2;
    const viewportCenterX = (viewport.x1 + viewport.x2) / 2;
    const viewportCenterY = (viewport.y1 + viewport.y2) / 2;

    // Calculate pan to center graph in adjusted viewport
    const targetPan = {
        x: viewportCenterX - bbCenterX * targetZoom,
        y: viewportCenterY - bbCenterY * targetZoom
    };

    // Animate to position
    cy.animate({
        zoom: targetZoom,
        pan: targetPan,
        duration: 500,
        easing: 'ease-in-out'
    });
}

/**
 * Get layout options with proper viewport boundaries
 * @param {string} layoutName - Name of the layout
 * @param {Object} cy - Cytoscape instance (optional, for dynamic calculations)
 * @returns {Object} Layout configuration
 */
function getLayoutOptionsWithViewport(layoutName, cy) {
    const viewport = getAdjustedViewport();

    const baseOptions = {
        animate: true,
        animationDuration: 1000,
        fit: false, // Manual fitting for better control
        boundingBox: viewport
    };

    const configs = {
        'fcose': {
            idealEdgeLength: 200,
            nodeOverlap: 1,
            nodeRepulsion: 2000,
            numIter: 2500,
            tile: true,
            tilingPaddingVertical: 10,
            tilingPaddingHorizontal: 10,
            randomize: true,
            quality: 'default'
        },
        'breadthfirst': {
            directed: true,
            spacingFactor: 1,
            avoidOverlap: true,
            circle: false,
            grid: false,
            maximal: false
        },
        'dagre': {
            rankDir: 'TB',
            rankSep: 100,
            nodeSep: 50,
            edgeSep: 25,
            ranker: 'network-simplex'
        },
        'circle': {
            avoidOverlap: true,
            avoidOverlapPadding: 30,
            radius: () => {
                if (!cy) return 100;
                const nodeCount = cy.nodes().length;
                return Math.max(50, nodeCount * 5);
            },
            startAngle: 0,
            sweep: () => {
                if (!cy) return 2 * Math.PI;
                const nodeCount = cy.nodes().length;
                return nodeCount <= 1 ? 2 * Math.PI : 2 * Math.PI * (nodeCount - 1) / nodeCount;
            },
            clockwise: true
        },
        'concentric': {
            minNodeSpacing: 80,
            levelWidth: () => 2,
            concentric: (node) => node.degree()
        },
        'grid': {
            avoidOverlap: true,
            avoidOverlapPadding: 10,
            condense: false
        }
    };

    return Object.assign({}, baseOptions, configs[layoutName] || {});
}

/**
 * Setup window resize handler for graph
 * @param {Object} cy - Cytoscape instance
 */
function setupResizeHandler(cy) {
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (cy && cy.nodes().length > 0) {
                ensureGraphVisible(cy);
            }
        }, 250);
    });
}

// Make functions available to the app namespace
document.addEventListener('DOMContentLoaded', function() {
    window.SchGraphApp = window.SchGraphApp || {};
    window.SchGraphApp.utils = window.SchGraphApp.utils || {};

    // Add new viewport utilities
    window.SchGraphApp.utils.getAdjustedViewport = getAdjustedViewport;
    window.SchGraphApp.utils.ensureGraphVisible = ensureGraphVisible;
    window.SchGraphApp.utils.getLayoutOptionsWithViewport = getLayoutOptionsWithViewport;
    window.SchGraphApp.utils.setupResizeHandler = setupResizeHandler;

    // Keep existing utilities
    window.SchGraphApp.utils.formatNodeDetails = formatNodeDetails;
    window.SchGraphApp.utils.formatEdgeDetails = formatEdgeDetails;
    window.SchGraphApp.utils.exportGraphAsPNG = exportGraphAsPNG;
    window.SchGraphApp.utils.escapeHTML = escapeHTML;
    window.SchGraphApp.utils.getTextColor = getTextColor;
    window.SchGraphApp.utils.getNodeTextColor = getNodeTextColor;
    window.SchGraphApp.utils.getEdgeTextColor = getEdgeTextColor;
});