# Schnauzer - NetworkX Graph Visualization

Schnauzer is a Python library that visualizes NetworkX graphs in a web browser with an interactive interface.

### Running the Server

From command line:
```bash
schnauzer-server --port 8080 --backend-port 8086
```

Or from Python:
```python
from schnauzer import Server

server = Server(web_port=8080, backend_port=8086)
server.start()
```

### Modifying Node/Edge Data
To really make use of this visualisation tool you should add some information to your graph. On boring pdf-plots you might not be able to add all the information you want but with this interactive solution you definitely can. So take your graph and add some attributes.

```python
import networkx as nx

# Create a graph or use an existing one
G = nx.Graph()

# Option 1: Add attributes on the fly when creating nodes and edges
G.add_node(1, name="Start Node", type="input", description="This is the start")
G.add_node(2, name="Process Node", type="process")
G.add_node(3, name="End Node", type="output")
G.add_edge(1, 2, name="Connection 1-2", weight=5)
G.add_edge(2, 3, name="Connection 2-3", weight=3)

# Option 2: Add or modify attributes of existing nodes and edges
G.nodes[1]['priority'] = 'high'
G.edges[2, 3]['weight'] = 10

# Option 3: Set multiple attributes at once
nx.set_node_attributes(G, {1: "critical", 2: "normal", 3: "low"}, "type")
nx.set_edge_attributes(G, {(1, 2): "data", (2, 3): "control"}, "type")

# Option 4: use an Iterator
for node, data in G.nodes(data=True): # need data=True to get the attributes as well!
    data['type'] = "critical"

for u, v, data in G.edges(data=True):
    data['type'] = "data"
```

### Displaying the Graph
Now that you have your very cool graph we can display it. Make sure that the server is already running when you send your graph.
```python
from schnauzer import VisualizationClient
import networkx as nx

G = nx.Graph()
client = VisualizationClient(host='localhost', port=8086)

# If not connected, connect and send the graph
client.send_graph(
    graph=G,
    title="Your super cool graph",
)

# We can use this function multiple times to update the graph in real time.
client.send_graph(G, title="Updated Network")

# Disconnect when done
client.disconnect()
```
Note that the connection is not closed until you close it manually.

### Coloring, Types and Labels:
#### Colors and types:
To color nodes and edges you can assign your nodes and edges a `type` attribute.
```python
import networkx as nx
G = nx.Graph()

nx.set_node_attributes(G, {1: "critical", 2: "normal", 3: "low"}, "type")
nx.set_edge_attributes(G, {(1, 2): "data", (2, 3): "control"}, "type")
```
Here we assigned the type critical, normal and low for some nodes and data and control for some edges. We can now assign colors to these types by creating a `type_color_map` dictionary.

```python
type_color_map = {
    # Node type colors
    "critical": "#FF5733",    # Orange-red 
    "normal": "#33A8FF",  # Blue
    "low": "#33FF57",   # Green
    
    # Edge type colors
    "data": "#777777",     # Dark gray
    "control": "#AA33AA",  # Purple
}
```
The visualization server will color the nodes and edges according to their assigned type and the colors defined in the `type_color_map`.

#### Labels:
You add arbitrary attributes to nodes and edges of your Graph. All attributes are displayed by default. There are some special names though:
- Add a `name` Attribute to assign your nodes and edges a name. **You want `name` to be unique!**
- Add a `type` Attribute to assign your nodes and edges a type. This is used to color the nodes and edges.
- Add a `description` Attribute to assign your nodes and edges a description that will be displayed on a little tooltip when you hover over nodes and edges. I'd recommend to keep this short though.

#### Filtering Labels:
If some other library creates the graph you want to visualize, you might have more attributes than you are interested in. Resulting in a bloated UI with too much information. Use the optional `node_labels` and `edge_labels` lists to filter for attributes that are displayed in the UI.


### Full example
```
```