import networkx as nx
from schnauzer import VisualizationClient
from time import sleep

G = nx.DiGraph()

nodes = [ 'A', 'B', 'C', 'D', 'E']
edges = [ ('A', 'B'), ('A', 'C'), ('B', 'D'), ('C', 'D'), ('D', 'E') ]

viz_client = VisualizationClient()

for node in nodes:
    G.add_node(node),
    for u, v in edges:
        G.add_edge(u, v) if node == v else None

    viz_client.send_graph(G, 'Live Updates')
    sleep(2) # Simulate some delay in adding nodes and edges







