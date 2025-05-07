import networkx as nx
from schnauzer import VisualizationClient

G = nx.DiGraph()

nodes = [ 'A', 'B', 'C', 'D', 'E']
edges = [ ('A', 'B'), ('A', 'C'), ('B', 'D'), ('C', 'D'), ('D', 'E') ]

G.add_nodes_from(nodes)
G.add_edges_from(edges)

viz_client = VisualizationClient()
viz_client.send_graph(G, 'Simple Graph')