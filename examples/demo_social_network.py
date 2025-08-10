"""
Social Network Analysis Example

A more realistic example showing a small social network with
various relationship types and community detection.
"""

import networkx as nx
from schnauzer import VisualizationClient

# Create a directed graph for a social network
G = nx.DiGraph()

# Define people with attributes and colors
people = [
    # Tech community - Green
    ("Alex", {"community": "tech", "role": "engineer", "experience": 5, "color": "#4CAF50"}),
    ("Blake", {"community": "tech", "role": "designer", "experience": 3, "color": "#4CAF50"}),
    ("Casey", {"community": "tech", "role": "engineer", "experience": 7, "color": "#4CAF50"}),
    ("Dana", {"community": "tech", "role": "manager", "experience": 10, "color": "#4CAF50"}),

    # Business community - Blue
    ("Evan", {"community": "business", "role": "sales", "experience": 4, "color": "#2196F3"}),
    ("Fran", {"community": "business", "role": "marketing", "experience": 6, "color": "#2196F3"}),
    ("Gale", {"community": "business", "role": "executive", "experience": 15, "color": "#2196F3"}),

    # Academic community - Orange
    ("Harper", {"community": "academic", "role": "professor", "experience": 12, "color": "#FF9800"}),
    ("Iris", {"community": "academic", "role": "researcher", "experience": 8, "color": "#FF9800"}),
    ("Jordan", {"community": "academic", "role": "student", "experience": 2, "color": "#FF9800"}),

    # Connectors between communities - Purple
    ("Kelly", {"community": "hybrid", "role": "consultant", "experience": 9, "color": "#9C27B0"}),
    ("Logan", {"community": "hybrid", "role": "entrepreneur", "experience": 11, "color": "#9C27B0"}),
]

# Define relationships with colors
relationships = [
    # Within tech community - Light green
    ("Alex", "Blake", {"type": "collaborates", "strength": 8, "color": "#81C784"}),
    ("Alex", "Casey", {"type": "collaborates", "strength": 9, "color": "#81C784"}),
    ("Blake", "Casey", {"type": "collaborates", "strength": 6, "color": "#81C784"}),
    ("Dana", "Alex", {"type": "manages", "strength": 7, "color": "#F44336"}),
    ("Dana", "Blake", {"type": "manages", "strength": 7, "color": "#F44336"}),
    ("Dana", "Casey", {"type": "manages", "strength": 8, "color": "#F44336"}),

    # Within business community
    ("Evan", "Fran", {"type": "collaborates", "strength": 7, "color": "#81C784"}),
    ("Gale", "Evan", {"type": "manages", "strength": 9, "color": "#F44336"}),
    ("Gale", "Fran", {"type": "manages", "strength": 8, "color": "#F44336"}),
    ("Fran", "Evan", {"type": "supports", "strength": 5, "color": "#64B5F6"}),

    # Within academic community - Light orange for mentoring
    ("Harper", "Iris", {"type": "mentors", "strength": 9, "color": "#FFB74D"}),
    ("Harper", "Jordan", {"type": "mentors", "strength": 8, "color": "#FFB74D"}),
    ("Iris", "Jordan", {"type": "collaborates", "strength": 6, "color": "#81C784"}),

    # Cross-community connections via connectors - Various colors
    ("Kelly", "Dana", {"type": "advises", "strength": 7, "color": "#BA68C8"}),
    ("Kelly", "Gale", {"type": "advises", "strength": 8, "color": "#BA68C8"}),
    ("Kelly", "Harper", {"type": "collaborates", "strength": 6, "color": "#81C784"}),

    ("Logan", "Alex", {"type": "invests", "strength": 7, "color": "#4CAF50"}),
    ("Logan", "Casey", {"type": "invests", "strength": 6, "color": "#4CAF50"}),
    ("Logan", "Evan", {"type": "partners", "strength": 8, "color": "#2196F3"}),
    ("Logan", "Iris", {"type": "funds", "strength": 5, "color": "#FF9800"}),

    # Some additional cross-community connections - Grey
    ("Casey", "Iris", {"type": "collaborates", "strength": 5, "color": "#81C784"}),
    ("Fran", "Blake", {"type": "consults", "strength": 4, "color": "#9E9E9E"}),
    ("Harper", "Dana", {"type": "advises", "strength": 6, "color": "#BA68C8"}),
]

G.add_nodes_from(people)
G.add_edges_from(relationships)

# Calculate some network metrics
degree_centrality = nx.degree_centrality(G)
betweenness = nx.betweenness_centrality(G)

# Add metrics as node attributes
for node in G.nodes():
    G.nodes[node]['degree_centrality'] = round(degree_centrality[node], 3)
    G.nodes[node]['betweenness'] = round(betweenness[node], 3)

# Send to visualization
viz_client = VisualizationClient()
viz_client.send_graph(G, 'Professional Network Analysis')