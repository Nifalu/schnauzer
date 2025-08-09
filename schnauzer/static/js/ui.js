/**
 * ui.js - UI and DOM management
 * Handles all DOM updates, panels, and status messages
 */

export class UI {
    constructor(state) {
        this.state = state;
        this.elements = {};
        this.statusTimeout = null;
    }

    init() {
        this.cacheElements();
        this.setupBasicListeners();
    }

    cacheElements() {
        this.elements = {
            // Containers
            graphContainer: document.getElementById('graph-container'),

            // Status
            statusMessage: document.getElementById('status-message'),

            // Details panel
            nodeDetails: document.getElementById('node-details'),
            nodeDetailsTitle: document.getElementById('node-details-title'),
            nodeDetailsContent: document.getElementById('node-details-content'),

            // Controls
            resetZoomBtn: document.getElementById('reset-zoom'),
            exportBtn: document.getElementById('export-graph'),
            layoutDropdown: document.querySelectorAll('.layout-option'),
            currentLayout: document.getElementById('current-layout'),

            // Stats
            nodeCount: document.getElementById('node-count'),
            edgeCount: document.getElementById('edge-count'),

            // Search
            searchBox: document.getElementById('search-nodes'),
            clearSearchBtn: document.getElementById('clear-search'),

            // Trace
            traceSelect: document.getElementById('trace-attribute'),
            originsCheckbox: document.getElementById('show-origins'),
            originsContainer: document.getElementById('show-origins-container'),

            // Spring control
            springSlider: document.getElementById('spring-length-slider'),
            springValue: document.getElementById('spring-length-value'),
            springControl: document.getElementById('spring-length-control'),

            // Tooltip
            tooltip: document.querySelector('.graph-tooltip') || this.createTooltip()
        };
    }

    createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'graph-tooltip';
        tooltip.style.opacity = '0';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    setupBasicListeners() {
        // Clear search button
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.addEventListener('click', () => {
                if (this.elements.searchBox) {
                    this.elements.searchBox.value = '';
                    this.elements.searchBox.dispatchEvent(new Event('input'));
                }
            });
        }

        // Set default active layout
        const fcoseOption = document.querySelector('.layout-option[data-layout="fcose"]');
        if (fcoseOption) {
            fcoseOption.classList.add('active');
        }
    }

    showStatus(message, type = 'info', duration = 0) {
        const el = this.elements.statusMessage;
        if (!el) return;

        clearTimeout(this.statusTimeout);

        el.textContent = message;
        el.className = `floating-panel status-panel alert alert-${type}`;
        el.classList.remove('d-none');

        if (duration > 0) {
            this.statusTimeout = setTimeout(() => {
                el.classList.add('d-none');
            }, duration);
        }
    }

    updateStats(data) {
        if (!data || !data.elements) return;

        const nodeCount = data.elements.nodes?.length || 0;
        const edgeCount = data.elements.edges?.length || 0;

        if (this.elements.nodeCount) {
            this.elements.nodeCount.textContent = nodeCount;
        }
        if (this.elements.edgeCount) {
            this.elements.edgeCount.textContent = edgeCount;
        }
    }

    updateTitle(title) {
        if (!title) return;

        document.title = title;
        const header = document.querySelector('h1.graph-title');
        if (header) {
            header.textContent = title;
        }
    }

    showNodeDetails(node) {
        const panel = this.elements.nodeDetails;
        if (!panel) return;

        panel.classList.remove('d-none');
        this.elements.nodeDetailsTitle.textContent = node.name || 'Node Details';

        // Apply node color to header
        const header = panel.querySelector('.panel-header');
        if (header) {
            header.style.backgroundColor = node.color || '#999';
            header.style.color = this.getTextColor(node.color || '#999');
        }

        // Use utils if available, otherwise simple display
        if (window.SchGraphApp?.utils?.formatNodeDetails) {
            this.elements.nodeDetailsContent.innerHTML =
                window.SchGraphApp.utils.formatNodeDetails(node);
        } else {
            this.elements.nodeDetailsContent.innerHTML = this.formatDetails(node);
        }
    }

    showEdgeDetails(edge) {
        const panel = this.elements.nodeDetails;
        if (!panel) return;

        panel.classList.remove('d-none');
        this.elements.nodeDetailsTitle.textContent = edge.name || 'Edge Details';

        if (window.SchGraphApp?.utils?.formatEdgeDetails) {
            this.elements.nodeDetailsContent.innerHTML =
                window.SchGraphApp.utils.formatEdgeDetails(edge);
        } else {
            this.elements.nodeDetailsContent.innerHTML = this.formatDetails(edge);
        }
    }

    hideDetails() {
        if (this.elements.nodeDetails) {
            this.elements.nodeDetails.classList.add('d-none');
        }
    }

    formatDetails(data) {
        // Simple fallback formatter
        let html = '';
        for (const [key, value] of Object.entries(data)) {
            if (key !== 'id' && value !== undefined && value !== null) {
                html += `<p><strong>${key}:</strong> ${value}</p>`;
            }
        }
        return html;
    }

    getTextColor(bgColor) {
        // Simple contrast calculation
        const color = bgColor.startsWith('#') ? bgColor.substring(1) : bgColor;
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
}