"""
Network Flow Example with Tracing

This example demonstrates how to visualize a network data flow with message tracing.
The traces show the origin path of each message through the network.

In the web interface:
- Click on edges to see their trace paths
- Enable "trace origins" to highlight the path
- Use arrow buttons to navigate between multiple paths
"""

import networkx as nx
from schnauzer import VisualizationClient

# Create a directed graph representing a network flow
G = nx.DiGraph()

# Define network components with types and colors
nodes = [
    # Sensors (data sources) - Green
    ("Temperature Sensor", {"type": "sensor", "color": "#4CAF50", "description": "Measures temperature"}),
    ("Humidity Sensor", {"type": "sensor", "color": "#4CAF50", "description": "Measures humidity"}),
    ("Pressure Sensor", {"type": "sensor", "color": "#4CAF50", "description": "Measures pressure"}),

    # Processing nodes - Blue
    ("Data Validator", {"type": "processor", "color": "#2196F3", "description": "Validates sensor data"}),
    ("Data Aggregator", {"type": "processor", "color": "#2196F3", "description": "Combines multiple streams"}),
    ("Anomaly Detector", {"type": "processor", "color": "#2196F3", "description": "Detects unusual patterns"}),

    # Storage and output - Orange/Purple
    ("Time Series DB", {"type": "storage", "color": "#FF9800", "description": "Stores historical data"}),
    ("Alert System", {"type": "output", "color": "#9C27B0", "description": "Sends notifications"}),
    ("Dashboard", {"type": "output", "color": "#9C27B0", "description": "Real-time visualization"}),
]

# Define data flows with message IDs
edges = [
    # From sensors to validator
    ("Temperature Sensor", "Data Validator", {"msg_id": 1, "type": "sensor_data"}),
    ("Humidity Sensor", "Data Validator", {"msg_id": 2, "type": "sensor_data"}),
    ("Pressure Sensor", "Data Validator", {"msg_id": 3, "type": "sensor_data"}),

    # From validator to aggregator
    ("Data Validator", "Data Aggregator", {"msg_id": 4, "type": "validated_data"}),

    # From aggregator to various outputs
    ("Data Aggregator", "Time Series DB", {"msg_id": 5, "type": "aggregated_data"}),
    ("Data Aggregator", "Anomaly Detector", {"msg_id": 6, "type": "aggregated_data"}),

    # From anomaly detector
    ("Anomaly Detector", "Alert System", {"msg_id": 7, "type": "alert"}),
    ("Anomaly Detector", "Dashboard", {"msg_id": 8, "type": "visualization_data"}),

    # Direct dashboard connection
    ("Data Aggregator", "Dashboard", {"msg_id": 9, "type": "visualization_data"}),
]

G.add_nodes_from(nodes)
G.add_edges_from(edges)

# Define color scheme
type_color_map = {
    "sensor": "#4CAF50",           # Green
    "processor": "#2196F3",         # Blue
    "storage": "#FF9800",           # Orange
    "output": "#9C27B0",            # Purple
    "sensor_data": "#81C784",       # Light green
    "validated_data": "#64B5F6",    # Light blue
    "aggregated_data": "#FFB74D",   # Light orange
    "alert": "#F44336",             # Red
    "visualization_data": "#BA68C8", # Light purple
}

# Define traces - showing how messages are produced from other messages
traces = {
    "4": [[[1, "Temperature Sensor", []], [2, "Humidity Sensor", []], [3, "Pressure Sensor", []], [4, "Data Validator", [1, 2, 3]]]],
    "5": [[[1, "Temperature Sensor", []], [2, "Humidity Sensor", []], [3, "Pressure Sensor", []], [4, "Data Validator", [1, 2, 3]], [5, "Data Aggregator", [4]]]],
    "7": [[[1, "Temperature Sensor", []], [2, "Humidity Sensor", []], [3, "Pressure Sensor", []], [4, "Data Validator", [1, 2, 3]], [6, "Data Aggregator", [4]], [7, "Anomaly Detector", [6]]]],
}

# Send to visualization
viz_client = VisualizationClient()
viz_client.send_graph(G, 'Network Data Flow with Tracing', traces=traces)
