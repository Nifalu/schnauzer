/**
 * filter.js - Attribute filtering functionality
 * Allows hiding elements that have specific attributes
 */

export class Filter {
    constructor(state, graph) {
        this.state = state;
        this.graph = graph;
        this.filterSelect = null;
        this.hiddenAttribute = null;

        this.init();
    }

    init() {
        this.filterSelect = document.getElementById('filter-attribute');
        if (!this.filterSelect) return;

        this.populateAttributes();
        this.setupListener();
    }

    populateAttributes() {
        const cy = this.state.get('cy');
        if (!cy || !this.filterSelect) return;

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
        this.filterSelect.innerHTML = '<option value="">Show all</option>';

        Array.from(attributes).sort().forEach(attr => {
            const option = document.createElement('option');
            option.value = attr;
            option.textContent = `Hide: ${attr}`;
            this.filterSelect.appendChild(option);
        });

        console.log(`Found ${attributes.size} filterable attributes`);
    }

    setupListener() {
        if (!this.filterSelect) return;

        this.filterSelect.addEventListener('change', () => {
            this.hiddenAttribute = this.filterSelect.value || null;
            this.applyFilter();
        });
    }

    applyFilter() {
        const cy = this.state.get('cy');
        if (!cy) return;

        // First show all elements
        cy.elements().style('display', 'element');

        if (!this.hiddenAttribute) {
            console.log('Filter cleared - showing all elements');
            return;
        }

        // Hide elements that have the selected attribute
        let hiddenCount = 0;
        cy.elements().forEach(el => {
            if (el.data(this.hiddenAttribute) !== undefined) {
                el.style('display', 'none');
                hiddenCount++;
            }
        });

        console.log(`Hiding ${hiddenCount} elements with attribute "${this.hiddenAttribute}"`);
    }

    reset() {
        // Clear the filter
        this.hiddenAttribute = null;

        if (this.filterSelect) {
            this.filterSelect.value = '';
        }

        // Re-populate attributes for the new graph
        this.populateAttributes();

        // Apply existing filter if there was one
        if (this.hiddenAttribute) {
            this.applyFilter();
        }
    }

    clear() {
        this.hiddenAttribute = null;
        if (this.filterSelect) {
            this.filterSelect.value = '';
        }
        this.applyFilter();
    }
}