/**
 * search.js - Search functionality
 * Handles node and edge searching with filters
 */

export class Search {
    constructor(state, graph) {
        this.state = state;
        this.graph = graph;
        this.searchBox = null;
        this.debounceTimeout = null;

        this.init();
    }

    init() {
        this.searchBox = document.getElementById('search-nodes');
        if (!this.searchBox) return;

        this.searchBox.addEventListener('input', (e) => {
            this.debounceSearch(e.target.value);
        });
    }

    debounceSearch(value) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            this.performSearch(value);
        }, 200);
    }

    performSearch(searchTerm) {
        const cy = this.state.get('cy');
        if (!cy) return;

        // Store search term
        this.state.set('searchTerm', searchTerm);

        // Clear previous highlights
        cy.elements().removeClass('dimmed highlighted');

        // If empty search, show all
        const term = searchTerm.toLowerCase().trim();
        if (!term) {
            return;
        }

        // Parse search term for filters
        const { filters, generalSearch } = this.parseSearchTerm(term);

        // Find matching elements
        const matchingNodes = cy.nodes().filter(node =>
            this.elementMatches(node.data(), filters, generalSearch)
        );

        const matchingEdges = cy.edges().filter(edge =>
            this.elementMatches(edge.data(), filters, generalSearch)
        );

        // Apply visual states
        this.applySearchHighlight(cy, matchingNodes, matchingEdges);

        // Store results
        this.state.set('searchResults', {
            nodes: matchingNodes.map(n => n.id()),
            edges: matchingEdges.map(e => e.id())
        });

        console.log(`Search found ${matchingNodes.length} nodes, ${matchingEdges.length} edges`);
    }

    parseSearchTerm(term) {
        const filters = [];
        let generalSearchTerms = [];

        // Split search into potential filters and general terms
        term.split(/\s+/).forEach(part => {
            if (part.includes(':') && part.split(':').length === 2) {
                const [attr, value] = part.split(':');
                if (attr && value) {
                    filters.push({
                        attribute: attr.toLowerCase(),
                        value: value.toLowerCase()
                    });
                }
            } else if (part) {
                generalSearchTerms.push(part);
            }
        });

        return {
            filters,
            generalSearch: generalSearchTerms.join(' ')
        };
    }

    elementMatches(data, filters, generalSearch) {
        // Check filters first
        for (const filter of filters) {
            const attrValue = String(data[filter.attribute] || '').toLowerCase();
            if (!attrValue.includes(filter.value)) {
                return false;
            }
        }

        // If only filters and they passed, match
        if (filters.length > 0 && !generalSearch) {
            return true;
        }

        // For general search, check all attributes
        if (generalSearch) {
            const searchableText = this.getSearchableText(data);
            return searchableText.includes(generalSearch);
        }

        return false;
    }

    getSearchableText(data) {
        return Object.entries(data)
            .map(([key, value]) => {
                if (Array.isArray(value)) {
                    return value.join(' ');
                } else if (typeof value === 'object' && value !== null) {
                    return JSON.stringify(value);
                }
                return String(value || '');
            })
            .join(' ')
            .toLowerCase();
    }

    applySearchHighlight(cy, matchingNodes, matchingEdges) {
        // Dim all elements first
        cy.elements().addClass('dimmed');

        // Highlight matches
        matchingNodes.removeClass('dimmed').addClass('highlighted');
        matchingEdges.removeClass('dimmed').addClass('highlighted');

        // Also highlight connected elements
        matchingNodes.connectedEdges().removeClass('dimmed').addClass('highlighted');
        matchingEdges.connectedNodes().removeClass('dimmed').addClass('highlighted');
    }

    reset() {
        const cy = this.state.get('cy');
        if (!cy) return;

        // Clear search box
        if (this.searchBox) {
            this.searchBox.value = '';
        }

        // Clear visual states
        cy.elements().removeClass('dimmed highlighted');

        // Clear state
        this.state.set('searchTerm', '');
        this.state.set('searchResults', { nodes: [], edges: [] });
    }

    clear() {
        if (this.searchBox) {
            this.searchBox.value = '';
            this.performSearch('');
        }
    }
}