import networkx as nx
from schnauzer import VisualizationClient

G = nx.MultiDiGraph()

nodes = [ 'A', 'B', 'C', 'D', 'E']
edges = [ ('A', 'B', 0), ('A', 'B', 1), ('A', 'C', 0), ('B', 'D', 0), ('C', 'D', 0),('C', 'D', 1),('C', 'D', 2), ('D', 'E', 0),('D', 'E', 1),('D', 'E', 2),('D', 'E', 3),('A', 'D', 0),('E', 'C', 0)]

G.add_nodes_from(nodes)
G.add_edges_from(edges)

viz_client = VisualizationClient()
viz_client.send_graph(G, 'Multi Graph')