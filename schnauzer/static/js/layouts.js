/**
 * layouts.js - Graph layout management
 * Handles all layout configurations and switching
 */

export class LayoutManager {
    constructor(state, graph) {
        this.state = state;
        this.graph = graph;
        this.currentLayout = null;
        this.currentLayoutName = 'fcose';

        this.setupListeners();
    }

    setupListeners() {
        // Layout dropdown
        document.querySelectorAll('.layout-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                const layoutName = option.getAttribute('data-layout');
                this.setLayout(layoutName);
            });
        });

        // Reset zoom button
        const resetBtn = document.getElementById('reset-zoom');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.graph.resetZoom());
        }

        // Export button
        const exportBtn = document.getElementById('export-graph');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.graph.exportAsPNG());
        }

        // Spring length slider (for force layouts)
        const slider = document.getElementById('spring-length-slider');
        const value = document.getElementById('spring-length-value');
        if (slider && value) {
            slider.addEventListener('input', () => {
                value.textContent = slider.value;
                if (this.currentLayoutName === 'fcose') {
                    this.updateSpringLength(parseInt(slider.value));
                }
            });
        }
    }

    setLayout(layoutName) {
        this.currentLayoutName = layoutName;
        this.state.set('layout', layoutName);

        // Stop current layout if running
        if (this.currentLayout) {
            this.currentLayout.stop();
        }

        // Get layout options from graph's smart options
        const options = this.getLayoutOptions(layoutName);

        // Run new layout with auto-fit
        this.currentLayout = this.graph.runLayoutWithFit(layoutName, options);

        // Update UI
        this.updateUI(layoutName);
        this.updateControlVisibility(layoutName);
    }

    getLayoutOptions(layoutName) {
        // Get smart options from graph
        const smartOptions = this.graph.getSmartLayoutOptions(layoutName);

        // We can override specific options here if needed
        const overrides = {};

        // For example, if we want to force specific settings for certain layouts
        switch (layoutName) {
            case 'fcose':
                // fcose-specific overrides if needed
                break;
            case 'dagre':
                // dagre-specific overrides if needed
                break;
            case 'breadthfirst':
                // breadthfirst-specific overrides if needed
                break;
            case 'circle':
                // circle-specific overrides if needed
                break;
            case 'concentric':
                // concentric-specific overrides if needed
                break;
            case 'grid':
                // grid-specific overrides if needed
                break;
        }

        return { ...smartOptions, ...overrides };
    }

    updateSpringLength(value) {
        const cy = this.state.get('cy');
        if (!cy) return;

        // Save current positions
        const positions = {};
        cy.nodes().forEach(node => {
            positions[node.id()] = {
                x: node.position('x'),
                y: node.position('y')
            };
        });

        // Get layout options and modify
        const options = this.getLayoutOptions('fcose');
        options.idealEdgeLength = value;
        options.randomize = false;
        options.positions = node => positions[node.id()];
        options.animationDuration = 300;
        options.numIter = 250;

        // Use runLayoutWithFit to ensure proper viewport adjustment
        this.currentLayout = this.graph.runLayoutWithFit('fcose', options);
    }

    updateUI(layoutName) {
        // Update active state in dropdown
        document.querySelectorAll('.layout-option').forEach(opt => {
            opt.classList.remove('active');
        });

        const activeOption = document.querySelector(`.layout-option[data-layout="${layoutName}"]`);
        if (activeOption) {
            activeOption.classList.add('active');
        }

        // Update display text
        const display = document.getElementById('current-layout');
        if (display) {
            const names = {
                'fcose': 'fCoSE',
                'breadthfirst': 'Tree',
                'dagre': 'Dagre',
                'circle': 'Circle',
                'concentric': 'Concentric',
                'grid': 'Grid'
            };
            display.textContent = names[layoutName] || layoutName;
        }
    }

    updateControlVisibility(layoutName) {
        const springControl = document.getElementById('spring-length-control');
        if (!springControl) return;

        if (layoutName === 'fcose') {
            springControl.classList.remove('d-none');
        } else {
            springControl.classList.add('d-none');
        }
    }
}