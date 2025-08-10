"""
Interactive Features Demo

This example creates a graph specifically designed to demonstrate
the search, filter, and trace features of Schnauzer.
"""

import networkx as nx
from schnauzer import VisualizationClient

# Create a graph with various attributes for demonstration
G = nx.DiGraph()

# Add nodes with different attributes and colors
nodes = [
    # Development team - Green
    ("Alice", {"role": "developer", "team": "backend", "level": "senior", "color": "#4CAF50"}),
    ("Bob", {"role": "developer", "team": "frontend", "level": "junior", "color": "#4CAF50"}),
    ("Charlie", {"role": "developer", "team": "backend", "level": "mid", "color": "#4CAF50"}),

    # Management - Red
    ("Diana", {"role": "manager", "team": "product", "level": "senior", "color": "#F44336"}),
    ("Eve", {"role": "manager", "team": "engineering", "level": "senior", "color": "#F44336"}),

    # QA team - Orange
    ("Frank", {"role": "tester", "team": "qa", "level": "mid", "color": "#FF9800"}),
    ("Grace", {"role": "tester", "team": "qa", "level": "senior", "color": "#FF9800"}),

    # Design team - Purple
    ("Henry", {"role": "designer", "team": "ux", "level": "mid", "color": "#9C27B0"}),
    ("Iris", {"role": "designer", "team": "ui", "level": "junior", "color": "#9C27B0"}),
]

# Add collaboration edges with colors
edges = [
    # Development collaborations - Blue
    ("Alice", "Charlie", {"type": "collaboration", "project": "api", "color": "#2196F3"}),
    ("Bob", "Henry", {"type": "collaboration", "project": "dashboard", "color": "#2196F3"}),
    ("Bob", "Iris", {"type": "collaboration", "project": "dashboard", "color": "#2196F3"}),

    # Management oversight - Red
    ("Diana", "Alice", {"type": "manages", "project": "api", "color": "#F44336"}),
    ("Diana", "Bob", {"type": "manages", "project": "dashboard", "color": "#F44336"}),
    ("Eve", "Alice", {"type": "manages", "department": "engineering", "color": "#F44336"}),
    ("Eve", "Charlie", {"type": "manages", "department": "engineering", "color": "#F44336"}),

    # QA interactions - Orange
    ("Frank", "Alice", {"type": "tests", "project": "api", "color": "#FF9800"}),
    ("Grace", "Bob", {"type": "tests", "project": "dashboard", "color": "#FF9800"}),
    ("Frank", "Charlie", {"type": "tests", "project": "api", "color": "#FF9800"}),

    # Cross-team collaboration - Grey
    ("Diana", "Eve", {"type": "coordination", "level": "executive", "color": "#607D8B"}),
    ("Henry", "Iris", {"type": "collaboration", "project": "design_system", "color": "#2196F3"}),
]

G.add_nodes_from(nodes)
G.add_edges_from(edges)

# Send to visualization
viz_client = VisualizationClient()
viz_client.send_graph(G, 'Team Network - Interactive Demo')