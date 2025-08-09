/**
 * interactions.js - User interaction handling
 * Handles clicks, hovers, tooltips, and selections
 */

export class InteractionHandler {
    constructor(state, ui, graph) {
        this.state = state;
        this.ui = ui;
        this.graph = graph;
        this.tooltipTimeout = null;
        this.hoveredElement = null;
    }

    init() {
        const cy = this.state.get('cy');
        if (!cy) return;

        this.setupNodeEvents(cy);
        this.setupEdgeEvents(cy);
        this.setupGeneralEvents(cy);
    }

    setupNodeEvents(cy) {
        // Node click - show details
        cy.on('tap', 'node', (evt) => {
            const node = evt.target;
            const data = node.data();

            this.state.setSelectedNode(data.id);
            this.ui.showNodeDetails(data);

            // Dispatch event for trace module
            window.dispatchEvent(new CustomEvent('elementClicked', {
                detail: { type: 'node', element: node }
            }));
        });

        // Node hover - show tooltip
        cy.on('mouseover', 'node', (evt) => {
            const node = evt.target;
            const data = node.data();
            this.hoveredElement = node;

            const tooltip = this.buildTooltip(data);
            const position = this.getTooltipPosition(evt);
            this.showTooltip(tooltip, position.x, position.y);
        });

        cy.on('mouseout', 'node', () => {
            this.hideTooltip();
        });
    }

    setupEdgeEvents(cy) {
        // Edge click - show details
        cy.on('tap', 'edge', (evt) => {
            const edge = evt.target;
            const data = edge.data();

            this.state.setSelectedEdge(data.id);
            this.ui.showEdgeDetails(data);

            // Dispatch event for trace module
            window.dispatchEvent(new CustomEvent('elementClicked', {
                detail: { type: 'edge', element: edge }
            }));
        });

        // Edge hover - show tooltip
        cy.on('mouseover', 'edge', (evt) => {
            const edge = evt.target;
            const data = edge.data();
            this.hoveredElement = edge;

            const tooltip = this.buildTooltip(data);
            const position = this.getTooltipPosition(evt);
            this.showTooltip(tooltip, position.x, position.y);
        });

        cy.on('mouseout', 'edge', () => {
            this.hideTooltip();
        });
    }

    setupGeneralEvents(cy) {
        // Background click - clear selection
        cy.on('tap', (evt) => {
            if (evt.target === cy) {
                this.state.clearSelection();
                this.ui.hideDetails();
            }
        });

        // Track mouse state for drag detection
        cy.on('mousedown', () => {
            this.state.set('isMouseDown', true);
            if (this.hoveredElement) {
                this.hideTooltip();
            }
        });

        cy.on('mouseup', () => {
            this.state.set('isMouseDown', false);
        });

        // Update tooltip position on mouse move
        cy.on('mousemove', (evt) => {
            if (this.hoveredElement && !this.state.get('isMouseDown')) {
                const tooltip = this.ui.elements.tooltip;
                if (tooltip && tooltip.style.opacity !== '0') {
                    const position = this.getTooltipPosition(evt);
                    tooltip.style.left = position.x + 'px';
                    tooltip.style.top = position.y + 'px';
                }
            }
        });
    }

    buildTooltip(data) {
        let html = '';

        // Format name with line breaks if needed
        const name = this.formatTooltipName(data.name || 'Element');
        html += `<h4>${name}</h4>`;

        // Add description if available
        if (data.description && data.description.trim() !== '') {
            const desc = data.description.length > 150
                ? data.description.substring(0, 147) + '...'
                : data.description;
            html += `<div class="node-description">${this.escapeHTML(desc)}</div>`;
        }

        return html;
    }

    formatTooltipName(name) {
        if (name.length <= 16) return name;

        let processedName = name.length > 32 ? name.substring(0, 32) : name;
        const midPoint = Math.floor(processedName.length / 2);

        // Try to find a good break point
        for (let i = midPoint; i >= Math.max(0, midPoint - 8); i--) {
            if (processedName[i] === ' ' || processedName[i] === '-' || processedName[i] === '_') {
                return processedName.substring(0, i) + '<br>' +
                       processedName.substring(i + 1);
            }
        }

        return processedName.substring(0, midPoint) + '<br>' +
               processedName.substring(midPoint);
    }

    getTooltipPosition(evt) {
        const container = this.state.get('cy').container();
        const rect = container.getBoundingClientRect();

        return {
            x: evt.renderedPosition.x + rect.left + 15,
            y: evt.renderedPosition.y + rect.top - 30
        };
    }

    showTooltip(html, x, y) {
        clearTimeout(this.tooltipTimeout);

        const tooltip = this.ui.elements.tooltip;
        if (!tooltip) return;

        tooltip.innerHTML = html;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
        tooltip.style.opacity = '0.95';
    }

    hideTooltip() {
        this.hoveredElement = null;

        this.tooltipTimeout = setTimeout(() => {
            const tooltip = this.ui.elements.tooltip;
            if (tooltip) {
                tooltip.style.opacity = '0';
            }
        }, 100);
    }

    escapeHTML(str = '') {
        if (str === null || str === undefined) return '';

        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}