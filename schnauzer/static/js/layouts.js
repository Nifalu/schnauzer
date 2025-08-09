// In schnauzer/static/js/layouts.js
// Update the LayoutManager class to use utilities:

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
            resetBtn.addEventListener('click', () => {
                this.graph.ensureGraphVisible();
            });
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

        // Get layout options
        const options = this.getLayoutOptions(layoutName);

        // Run new layout with auto-fit
        this.currentLayout = this.graph.runLayoutWithFit(layoutName, options);

        // Update UI
        this.updateUI(layoutName);
        this.updateControlVisibility(layoutName);
    }

    getLayoutOptions(layoutName) {
        // Try to use utils first
        const viewport = this.graph.getAdjustedViewport();

        const baseOptions = {
            animate: true,
            animationDuration: 1000,
            fit: false,
            boundingBox: viewport
        };

        // Fallback to basic options if utils not available
        return {
            name: layoutName,
            animate: true,
            animationDuration: 1000,
            fit: false
        };
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

        // Run layout with new spring length
        const options = this.getLayoutOptions('fcose');
        options.idealEdgeLength = value;
        options.randomize = false;
        options.positions = node => positions[node.id()];
        options.animationDuration = 300;
        options.numIter = 250;

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