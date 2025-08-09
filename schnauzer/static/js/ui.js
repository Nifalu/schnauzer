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

            // Filter
            filterSelect: document.getElementById('filter-attribute'),

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

        // Setup expand/collapse for long values in details panel
        if (this.elements.nodeDetailsContent) {
            this.elements.nodeDetailsContent.addEventListener('click', (e) => {
                if (e.target.classList.contains('expand-toggle')) {
                    e.preventDefault();
                    const action = e.target.dataset.action;
                    const targetId = e.target.dataset.target;

                    if (action === 'expand') {
                        document.getElementById(targetId + '-short').style.display = 'none';
                        document.getElementById(targetId + '-full').style.display = 'inline';
                    } else {
                        document.getElementById(targetId + '-short').style.display = 'inline';
                        document.getElementById(targetId + '-full').style.display = 'none';
                    }
                }
            });
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
        if (!data || !data.elements) {
            // No data yet
            if (this.elements.nodeCount) {
                this.elements.nodeCount.textContent = '0';
            }
            if (this.elements.edgeCount) {
                this.elements.edgeCount.textContent = '0';
            }
            return;
        }

        const nodeCount = data.elements.nodes?.length || 0;
        const edgeCount = data.elements.edges?.length || 0;

        if (this.elements.nodeCount) {
            this.elements.nodeCount.textContent = nodeCount;
        }
        if (this.elements.edgeCount) {
            this.elements.edgeCount.textContent = edgeCount;
        }

        // Show a subtle hint if graph is empty
        if (nodeCount === 0 && edgeCount === 0) {
            // Add a subtle background message
            if (!document.getElementById('empty-graph-message')) {
                const container = this.elements.graphContainer;
                if (container) {
                    const emptyMsg = document.createElement('div');
                    emptyMsg.id = 'empty-graph-message';
                    emptyMsg.style.cssText = `
                        position: absolute;
                        top: 90%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: #999;
                        font-size: 18px;
                        text-align: center;
                        pointer-events: none;
                        user-select: none;
                        z-index: 1;
                    `;
                    emptyMsg.innerHTML = `
                        <div>No graph data available</div>
                        <div style="font-size: 14px; color: #aaa; margin-top: 8px;">Waiting for data...</div>
                    `;
                    container.appendChild(emptyMsg);
                }
            }
        } else {
            // Remove empty message if it exists
            const emptyMsg = document.getElementById('empty-graph-message');
            if (emptyMsg) {
                emptyMsg.remove();
            }
        }
    }

    updateTitle(title) {
        // Use a default title if none provided
        const displayTitle = title || 'Schnauzer Graph Visualization';

        document.title = displayTitle;
        const header = document.querySelector('h1.graph-title');
        if (header) {
            header.textContent = displayTitle;
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

        // Format details with proper handling
        this.elements.nodeDetailsContent.innerHTML = this.formatDetails(node, 'node');
    }

    showEdgeDetails(edge) {
        const panel = this.elements.nodeDetails;
        if (!panel) return;

        panel.classList.remove('d-none');
        this.elements.nodeDetailsTitle.textContent = edge.name || 'Edge Details';

        // Apply edge color to header (same as for nodes)
        const header = panel.querySelector('.panel-header');
        if (header) {
            header.style.backgroundColor = edge.color || '#999';
            header.style.color = this.getTextColor(edge.color || '#999');
        }

        // Format details with proper handling
        this.elements.nodeDetailsContent.innerHTML = this.formatDetails(edge, 'edge');
    }

    hideDetails() {
        if (this.elements.nodeDetails) {
            this.elements.nodeDetails.classList.add('d-none');
        }
    }

    formatDetails(data, elementType = 'node') {
        let html = '';

        // 1. Description first (without label, styled differently)
        if (data.description && data.description.trim() !== '') {
            html += `<div class="mb-3 pb-2 border-bottom text-muted fst-italic">${this.escapeHTML(data.description)}</div>`;
        }

        // 2. Source and Target for edges (if present)
        if (elementType === 'edge') {
            if (data.source) {
                html += `<p class="mb-1"><strong>Source:</strong> ${this.escapeHTML(data.source)}</p>`;
            }
            if (data.target) {
                html += `<p class="mb-1"><strong>Target:</strong> ${this.escapeHTML(data.target)}</p>`;
            }
        }

        // 3. Type if present
        if (data.type) {
            html += `<p class="mb-1"><strong>Type:</strong> ${this.escapeHTML(data.type)}</p>`;
        }

        // 4. Labels - handle them specially
        if (data.labels) {
            if (typeof data.labels === 'object' && !Array.isArray(data.labels)) {
                // Object with key-value pairs
                for (const [key, value] of Object.entries(data.labels)) {
                    html += `<p class="mb-2"><strong>${this.escapeHTML(key)}:</strong> ${this.formatValue(value)}</p>`;
                }
            } else {
                // Array or string
                html += `<p class="mb-1"><strong>Labels:</strong> ${this.formatValue(data.labels)}</p>`;
            }
        }

        // 5. Skip these special keys
        const skipKeys = ['id', 'name', 'color', 'description', 'source', 'target', 'type', 'labels', 'x', 'y'];

        // 6. All other attributes
        for (const [key, value] of Object.entries(data)) {
            if (!skipKeys.includes(key) && value !== undefined && value !== null) {
                html += `<p class="mb-1"><strong>${this.escapeHTML(key)}:</strong> ${this.formatValue(value)}</p>`;
            }
        }

        return html || '<p>No details available</p>';
    }

    formatValue(value) {
        if (value === null || value === undefined) {
            return '';
        }

        let fullText = '';

        if (Array.isArray(value)) {
            if (value.length === 0) return '[]';

            // Format all array elements
            const formatted = value.map(v => {
                if (typeof v === 'object' && v !== null) {
                    return JSON.stringify(v);
                }
                return String(v);
            });

            fullText = formatted.join(', ');
        } else if (typeof value === 'object') {
            // For objects, stringify compactly
            fullText = JSON.stringify(value);
        } else {
            // For strings and primitives
            fullText = String(value);
        }

        // If text is short enough, just return it
        const maxLength = 150;
        if (fullText.length <= maxLength) {
            return this.escapeHTML(fullText);
        }

        // For long text, create expandable element
        const truncated = fullText.substring(0, maxLength) + '...';
        const uniqueId = 'expand-' + Math.random().toString(36).slice(2, 11);

        return `
            <span class="expandable-value">
                <span id="${uniqueId}-short">
                    ${this.escapeHTML(truncated)}
                    <a href="#" class="expand-toggle text-primary text-decoration-none ms-1" 
                       data-action="expand" data-target="${uniqueId}">[+]</a>
                </span>
                <span id="${uniqueId}-full" style="display: none; word-break: break-word;">
                    ${this.escapeHTML(fullText)}
                    <a href="#" class="expand-toggle text-primary text-decoration-none ms-1" 
                       data-action="collapse" data-target="${uniqueId}">[-]</a>
                </span>
            </span>
        `;
    }

    escapeHTML(str) {
        if (str === null || str === undefined) return '';

        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, '<br>');  // Preserve line breaks in descriptions
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