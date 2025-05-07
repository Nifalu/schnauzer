import networkx as nx
from schnauzer import VisualizationClient

G = nx.DiGraph()

nodes = [
    ('Entry', {'description': 'Here the program starts'}),
    ('Condition', {'description': 'Take red if you are brave'}),
    ('If Block', {'description': 'good choice'}),
    ('Red Pill', {'description': 'very nice'}),
    ('Else Block', {'description': 'bad choice'}),
    ('Blue Pill', {'description': 'not cool'}),
    ('Exit', {'description': 'Goodbye'})
]

edges = [
    ('Entry', 'Condition', {'description': 'Edges can also have attributes'}),
    ('Condition', 'If Block', {'description': 'Add any attribute you want'}),
    ('Condition', 'Else Block', {'description': 'Some attributes'}),
    ('If Block', 'Red Pill', {'description': 'They will all appear in the details panel'}),
    ('Else Block', 'Blue Pill', {'description': "like 'description', 'name' or 'type'"}),
    ('Red Pill', 'Exit', {'description': 'but are hidden in the graph for clarity'}),
    ('Blue Pill', 'Exit', {'description': 'have special rendering'}),
]

G.add_nodes_from(nodes)
G.add_edges_from(edges)

viz_client = VisualizationClient()
viz_client.send_graph(G, 'Graph with Custom Attributes')