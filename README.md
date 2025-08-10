# Schnauzer - Interactive NetworkX Graph Visualization

Schnauzer is a Python library that visualizes NetworkX graphs in a web browser with an interactive, real-time interface powered by Cytoscape.js.

*NOTE: This library was mainly written by Claude 4 and 4.1 from Anthropic.*

![demo3.png](img/demo2.png)

## ✨ Features

- **Real-time Updates**: Live graph updates without page refresh
- **Interactive Interface**: Pan, zoom, click nodes/edges for details
- **Search & Filter**: Search by any attribute, filter elements dynamically
- **Tracing**: Track data flow paths and attribute origins
- **Multiple Layouts**: Force-directed (fCoSE), hierarchical (Dagre), tree, circular, and more
- **Custom Styling**: Color nodes and edges by type with automatic legend
- **Rich Attributes**: Add descriptions, metadata, and custom properties to any element
- **Multi-graph Support**: Visualize graphs with parallel edges between nodes

## 🚀 Quick Start

### Installation
```bash
pip install schnauzer
```

### Basic Usage

1. **Start the server** (in a terminal):
```bash
schnauzer-server
```

2. **Send your graph** (in Python):
```python
import networkx as nx
from schnauzer import VisualizationClient

# Create a graph
G = nx.DiGraph()
G.add_edge("A", "B")
G.add_edge("B", "C")

# Visualize it
client = VisualizationClient()
client.send_graph(G, title="My First Graph")
```

3. **View in browser**: Open http://localhost:8080

## 📊 Examples

### Adding Node and Edge Attributes
```python
import networkx as nx
from schnauzer import VisualizationClient

G = nx.DiGraph()

# Add nodes with attributes
G.add_node("Server", type="hardware", status="running")
G.add_node("Database", type="storage", status="running")
G.add_node("Client", type="user", status="idle")

# Add edges with attributes
G.add_edge("Client", "Server", protocol="HTTP", latency=20)
G.add_edge("Server", "Database", protocol="SQL", latency=5)

client = VisualizationClient()
client.send_graph(G, title="System Architecture")
```

### Custom Colors
```python
import networkx as nx
from schnauzer import VisualizationClient

G = nx.DiGraph()

# Add nodes with color attributes
nodes = [
    ("API", {"type": "service", "color": "#4A90E2", "description": "REST API endpoint"}),
    ("Auth", {"type": "service", "color": "#4A90E2", "description": "Authentication service"}),
    ("Users", {"type": "database", "color": "#50E3C2", "description": "User data storage"}),
    ("Cache", {"type": "cache", "color": "#F5A623", "description": "Redis cache layer"}),
]

# Add edges with color attributes
edges = [
    ("API", "Auth", {"type": "auth_check", "color": "#7ED321"}),
    ("API", "Cache", {"type": "cache_lookup", "color": "#BD10E0"}),
    ("Auth", "Users", {"type": "db_query", "color": "#9013FE"}),
    ("API", "Users", {"type": "db_query", "color": "#9013FE"}),
]

G.add_nodes_from(nodes)
G.add_edges_from(edges)

client = VisualizationClient()
client.send_graph(G, title="Microservices")
```

### Message Tracing (Advanced)
![demo1.png](img/demo1.png)
```python
import networkx as nx
from schnauzer import VisualizationClient

# Create a data pipeline graph
G = nx.DiGraph()

# Add processing stages
G.add_node("Sensor", type="source")
G.add_node("Filter", type="processor")
G.add_node("Analyzer", type="processor")  
G.add_node("Storage", type="sink")

# Add data flow edges with message IDs
G.add_edge("Sensor", "Filter", msg_id=1, msg_type="raw_data")
G.add_edge("Filter", "Analyzer", msg_id=2, msg_type="filtered_data")
G.add_edge("Analyzer", "Storage", msg_id=3, msg_type="results")

# Define traces showing how msg_id=3 was produced
traces = {
    "3": [  # Trace for message 3
        [
            [1, "Sensor", []],        # Message 1 produced by Sensor
            [2, "Filter", [1]],       # Message 2 produced by Filter from message 1
            [3, "Analyzer", [2]]      # Message 3 produced by Analyzer from message 2
        ]
    ]
}

client = VisualizationClient()
client.send_graph(G, title="Data Pipeline with Tracing", traces=traces)
```

## 🎨 Interactive Features

Once your graph is displayed, you can:

- **🔍 Search**: Find nodes/edges by any attribute (type `name:Server` or `type:database`)
- **📍 Trace Attribute**: Select an attribute to highlight all elements with matching values
- **👁️ Hide Elements**: Filter out elements with specific attributes
- **🔄 Change Layout**: Switch between force-directed, hierarchical, circular layouts
- **📸 Export**: Save the graph as a PNG image
- **🔎 Zoom & Pan**: Navigate large graphs easily
- **📝 View Details**: Click any element to see all its attributes

## 🛠️ API Reference

### VisualizationClient

```python
client = VisualizationClient(host='localhost', port=8086)
```

**Parameters:**
- `host`: Server hostname (default: 'localhost')
- `port`: Server backend port (default: 8086)

### send_graph()

```python
client.send_graph(graph, title=None, traces=None)
```

**Parameters:**
- `graph`: NetworkX graph object
- `title`: Display title (optional)
- `traces`: Dict mapping element IDs to their origin paths (optional)

### Server

```python
from schnauzer import Server

server = Server(web_port=8080, backend_port=8086)
server.start()  # Blocking call
```

**Parameters:**
- `web_port`: Web interface port (default: 8080)
- `backend_port`: Client connection port (default: 8086)

## 📋 Tips

1. **Node Labels**: Add a `name` attribute for custom node labels
2. **Descriptions**: Add a `description` attribute for hover tooltips
3. **Colors**: Set `color` attribute directly on nodes/edges (e.g., `color="#FF5733"`)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

MIT License - see LICENSE file for details