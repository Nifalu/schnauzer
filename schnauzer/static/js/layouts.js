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

        // Get layout options
        const options = this.getLayoutOptions(layoutName);

        // Run new layout
        this.currentLayout = this.graph.runLayout(layoutName, options);

        // Update UI
        this.updateUI(layoutName);
        this.updateControlVisibility(layoutName);
    }

    getLayoutOptions(layoutName) {
        const baseOptions = {
            animate: true,
            animationDuration: 1000,
            fit: false,
            boundingBox: {
                x1: 20,
                y1: 100,
                x2: window.innerWidth - 350,
                y2: window.innerHeight - 100
            }
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
                    const cy = this.state.get('cy');
                    if (!cy) return 100;
                    const nodeCount = cy.nodes().length;
                    return Math.max(50, nodeCount * 5);
                },
                startAngle: 0,
                sweep: () => {
                    const cy = this.state.get('cy');
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

        this.currentLayout = this.graph.runLayout('fcose', options);
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