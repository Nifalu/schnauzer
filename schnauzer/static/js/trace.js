/**
 * trace.js - Trace functionality
 * Handles attribute tracing and origin path highlighting
 */

export class Trace {
    constructor(state, graph, ui) {
        this.state = state;
        this.graph = graph;
        this.ui = ui;

        this.traceSelect = null;
        this.originsCheckbox = null;
        this.originsContainer = null;

        this.init();
    }

    init() {
        this.cacheElements();
        this.populateAttributes();
        this.setupListeners();
        this.updateOriginsVisibility();
    }

    cacheElements() {
        this.traceSelect = document.getElementById('trace-attribute');
        this.originsCheckbox = document.getElementById('show-origins');
        this.originsContainer = document.getElementById('show-origins-container');
    }

    populateAttributes() {
        const cy = this.state.get('cy');
        if (!cy || !this.traceSelect) return;

        const attributes = new Set();

        // Collect attributes from nodes
        cy.nodes().forEach(node => {
            Object.keys(node.data()).forEach(key => {
                if (key !== 'id' && key !== 'name') {
                    attributes.add(key);
                }
            });
        });

        // Collect attributes from edges
        cy.edges().forEach(edge => {
            Object.keys(edge.data()).forEach(key => {
                if (key !== 'id' && key !== 'source' && key !== 'target') {
                    attributes.add(key);
                }
            });
        });

        // Populate dropdown
        this.traceSelect.innerHTML = '<option value="">No trace</option>';
        Array.from(attributes).sort().forEach(attr => {
            const option = document.createElement('option');
            option.value = attr;
            option.textContent = attr;
            this.traceSelect.appendChild(option);
        });
    }

    setupListeners() {
        // Attribute selection
        if (this.traceSelect) {
            this.traceSelect.addEventListener('change', () => {
                const attribute = this.traceSelect.value || null;
                this.state.set('traceAttribute', attribute);
                this.clearHighlights();
            });
        }

        // Origins checkbox
        if (this.originsCheckbox) {
            this.originsCheckbox.addEventListener('change', () => {
                const showOrigins = this.originsCheckbox.checked;
                this.state.set('showOrigins', showOrigins);
                this.state.set('currentPathIndex', 0);
                this.state.set('currentPaths', []);
                this.clearHighlights();
            });
        }

        // Listen for element clicks
        window.addEventListener('elementClicked', (e) => {
            this.handleElementClick(e.detail);
        });
    }

    updateOriginsVisibility() {
        if (!this.originsContainer) return;

        const traces = this.state.get('traces');
        if (traces) {
            this.originsContainer.classList.remove('d-none');
        } else {
            this.originsContainer.classList.add('d-none');
            this.state.set('showOrigins', false);
            if (this.originsCheckbox) {
                this.originsCheckbox.checked = false;
            }
        }
    }

    handleElementClick(detail) {
        const { type, element } = detail;

        if (this.state.get('showOrigins') && type === 'edge') {
            this.traceOrigins(element);
        } else if (this.state.get('traceAttribute')) {
            this.traceAttribute(element);
        }
    }

    traceAttribute(element) {
        const cy = this.state.get('cy');
        if (!cy) return;

        const attribute = this.state.get('traceAttribute');
        const data = element.data();
        const value = data[attribute];

        if (value === undefined || value === null || value === '') {
            console.log(`No value for attribute "${attribute}"`);
            return;
        }

        // Clear previous highlights
        this.clearHighlights();

        // Find matching elements
        const valueStr = String(value).toLowerCase().trim();
        const matches = cy.elements().filter(el => {
            const elValue = el.data()[attribute];
            if (elValue === undefined || elValue === null) return false;

            const elValueStr = String(elValue).toLowerCase().trim();
            return elValueStr.includes(valueStr);
        });

        // Apply highlight
        matches.addClass('trace-highlight');

        console.log(`Traced ${attribute}="${value}": found ${matches.length} matches`);
    }

    traceOrigins(edge) {
        const msgId = edge.data('msg_id');
        if (msgId === undefined || msgId === null) {
            console.log('Edge has no msg_id');
            return;
        }

        const traces = this.state.get('traces');
        if (!traces) {
            console.log('No traces available');
            return;
        }

        const paths = traces[String(msgId)];
        if (!paths || paths.length === 0) {
            console.log(`No paths found for msg_id ${msgId}`);
            return;
        }

        // Store paths in state
        this.state.set('currentPaths', paths);
        this.state.set('currentPathIndex', 0);

        // Highlight paths
        this.highlightPaths(paths, edge);

        // Update UI if edge is selected
        if (this.state.get('selectedEdge') === edge.data('id')) {
            this.addPathNavigation();
        }
    }

    highlightPaths(paths, clickedEdge) {
        const cy = this.state.get('cy');
        if (!cy) return;

        // Clear existing highlights
        cy.edges().removeClass('trace-highlight trace-highlight-secondary');

        const currentIndex = this.state.get('currentPathIndex');

        // Mark all paths as secondary
        paths.forEach(path => {
            const pathEdges = this.tracePathBackwards(path, clickedEdge, cy);
            pathEdges.forEach(edge => {
                edge.addClass('trace-highlight-secondary');
            });
        });

        // Mark current path as primary
        if (paths[currentIndex]) {
            const currentPathEdges = this.tracePathBackwards(paths[currentIndex], clickedEdge, cy);
            currentPathEdges.forEach(edge => {
                edge.removeClass('trace-highlight-secondary');
                edge.addClass('trace-highlight');
            });
        }
    }

    tracePathBackwards(path, startEdge, cy) {
        const pathEdges = [startEdge];

        // Build production map
        const productionMap = new Map();
        path.forEach(([msgId, componentName, consumedIds]) => {
            if (componentName && consumedIds) {
                const key = `${componentName}|${msgId}`;
                productionMap.set(key, new Set(consumedIds.map(id => Number(id))));
            }
        });

        // Find edges in path
        cy.edges().forEach(edge => {
            if (edge === startEdge) return;

            const edgeMsgId = Number(edge.data('msg_id'));
            const edgeTarget = edge.target().data('name');
            const edgeSource = edge.source().data('name');

            // Check if this edge is part of the path
            for (const [key, consumedIds] of productionMap) {
                const [component] = key.split('|');

                if (component === edgeTarget && consumedIds.has(edgeMsgId)) {
                    // Verify source
                    for (const [pathMsgId, pathComponent] of path) {
                        if (Number(pathMsgId) === edgeMsgId && pathComponent === edgeSource) {
                            pathEdges.push(edge);
                            return;
                        }
                    }
                }
            }
        });

        return pathEdges;
    }

    addPathNavigation() {
        const paths = this.state.get('currentPaths');
        const currentIndex = this.state.get('currentPathIndex');

        if (!paths || paths.length === 0) return;

        // Create navigation controls
        const navHTML = `
            <div class="path-navigation mb-3 p-2 bg-light rounded">
                <div class="d-flex justify-content-between align-items-center">
                    <span>Path ${currentIndex + 1} of ${paths.length}</span>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary" id="path-prev">
                            <i class="bi bi-chevron-left"></i>
                        </button>
                        <button class="btn btn-outline-secondary" id="path-next">
                            <i class="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add to details panel
        const detailsContent = this.ui.elements.nodeDetailsContent;
        if (detailsContent) {
            const existingNav = detailsContent.querySelector('.path-navigation');
            if (existingNav) {
                existingNav.remove();
            }
            detailsContent.insertAdjacentHTML('afterbegin', navHTML);

            // Add navigation listeners
            const prevBtn = document.getElementById('path-prev');
            const nextBtn = document.getElementById('path-next');

            if (prevBtn) {
                prevBtn.disabled = currentIndex === 0;
                prevBtn.addEventListener('click', () => this.navigatePath(-1));
            }

            if (nextBtn) {
                nextBtn.disabled = currentIndex === paths.length - 1;
                nextBtn.addEventListener('click', () => this.navigatePath(1));
            }
        }
    }

    navigatePath(direction) {
        const paths = this.state.get('currentPaths');
        const currentIndex = this.state.get('currentPathIndex');

        const newIndex = Math.max(0, Math.min(currentIndex + direction, paths.length - 1));
        this.state.set('currentPathIndex', newIndex);

        // Re-highlight with new primary path
        const cy = this.state.get('cy');
        const selectedEdgeId = this.state.get('selectedEdge');

        if (cy && selectedEdgeId) {
            const edge = cy.edges().filter(e => e.data('id') === selectedEdgeId)[0];
            if (edge) {
                this.highlightPaths(paths, edge);
                this.addPathNavigation();
            }
        }
    }

    clearHighlights() {
        const cy = this.state.get('cy');
        if (!cy) return;

        cy.elements().removeClass('trace-highlight trace-highlight-secondary');
    }

    reset() {
        this.clearHighlights();
        this.populateAttributes();
        this.updateOriginsVisibility();

        if (this.traceSelect) {
            this.traceSelect.value = '';
        }

        this.state.set('traceAttribute', null);
        this.state.set('currentPaths', []);
        this.state.set('currentPathIndex', 0);
    }
}