"""Client module for connecting to the visualization server using ZeroMQ.

This module provides a client interface to send NetworkX graph data to the
Schnauzer visualization server for interactive rendering with Cytoscape.js.
"""
import networkx as nx
import zmq
import json
import atexit
import networkx
import logging

log = logging.getLogger(__name__)

class VisualizationClient:
    """Client for sending graph data to the visualization server.

    This class handles the connection to a running Schnauzer visualization server
    and provides methods to convert and send NetworkX graph data for display.
    """

    def __init__(self, host='localhost', port=8086, log_level = logging.WARN):
        """Initialize the visualization client.

        Args:
            host (str): Hostname or IP address of the visualization server
            port (int): Port number the server is listening on
        """
        log.setLevel(log_level)
        self.host = host
        self.port = port
        self.context = zmq.Context()
        self.socket = None
        self.connected = False

        # Ensure proper cleanup on program exit
        atexit.register(self.disconnect)

    def _connect(self):
        """Establish a non-blocking connection to the visualization server.

        Returns:
            bool: True if connection was successful, False otherwise
        """
        # Already connected? Just return
        if self.connected:
            return True

        try:
            # Create a ZeroMQ REQ socket
            self.socket = self.context.socket(zmq.REQ)
            self.socket.setsockopt(zmq.LINGER, 0)  # Don't wait on close
            self.socket.setsockopt(zmq.RCVTIMEO, 5000)  # 5 second timeout for future operations

            log.info(f"Trying to connect to visualization server at {self.host}:{self.port} ... ")

            self.socket.connect(f"tcp://{self.host}:{self.port}")
            log.info("Success!")

            self.connected = True
            return True
        except zmq.error.ZMQError as e:
            log.error(f"Could not create socket: {e}")
            self.socket = None
            return False

    def disconnect(self):
        """Close the connection to the visualization server."""
        if self.socket:
            try:
                self.socket.close()
                log.info("Disconnected from visualization server")
            except:
                pass
            self.socket = None
            self.connected = False
        if hasattr(self, 'context') and self.context:
            self.context.term()

    def send_graph(self, graph: networkx.Graph,
                   title=None,
                   node_labels: list[str] = None,
                   edge_labels: list[str] = None,
                   type_color_map: dict[str, str]=None):
        """Send networkx graph data to the visualization server.

        This method converts a NetworkX graph to Cytoscape.js JSON format suitable for
        visualization and sends it to the connected server.

        Args:
            graph (networkx.Graph): A NetworkX graph object to visualize
            title (str, optional): Title for the visualization
            node_labels (list[str], optional): List of node attributes to display in visualization
            edge_labels (list[str], optional): List of edge attributes to display in visualization
            type_color_map (dict[str, str], optional): Mapping of node/edge types to colors (hex format)

        Returns:
            bool: True if successfully sent, False otherwise
        """
        if not self.connected:
            success = self._connect()
            if not success:
                return False

        # Convert networkx graph to Cytoscape JSON format
        graph_data = self._convert_graph_to_json(
            graph,
            node_labels,
            edge_labels,
            type_color_map)

        # Add title if provided
        if title:
            graph_data['title'] = title

        # Serialize graph data
        graph_json = json.dumps(graph_data)

        try:
            # Send the message
            self.socket.send_string(graph_json)

            # Wait for acknowledgement
            ack = self.socket.recv_string()
            log.info(f"Server response: {ack}")

            return True
        except zmq.error.ZMQError as e:
            log.error(f"Error sending graph data: {e}")
            self.connected = False
            if self.socket:
                self.socket.close()
            self.socket = None
            # Try to reconnect once
            return self._connect() and self.send_graph(graph, title)
        except Exception as e:
            log.error(f"Unexpected error sending graph data: {e}")
            self.connected = False
            if self.socket:
                self.socket.close()
            self.socket = None
            return False

    @staticmethod
    def _convert_graph_to_json(graph: networkx.Graph,
                               node_labels: list[str] = None,
                               edge_labels: list[str] = None,
                               type_color_map: dict[str, str] = None):
        """Convert a NetworkX graph to Cytoscape.js JSON format.

        Args:
            graph (networkx.Graph): The graph to convert
            node_labels (list[str], optional): List of node attributes to include
            edge_labels (list[str], optional): List of edge attributes to include
            type_color_map (dict[str, str], optional): Mapping of node/edge types to colors

        Returns:
            dict: JSON-serializable structure representing the graph in Cytoscape format
        """
        # Cytoscape expects 'elements' with 'nodes' and 'edges'
        json_data = {
            'elements': {
                'nodes': [],
                'edges': []
            }
        }

        # Helper function remains the same
        def make_serializable(any_value):
            if not any_value:
                return "None"
            if isinstance(any_value, (str, int, float, bool)):
                return any_value
            elif hasattr(any_value, 'to_dict') and callable(any_value.to_dict):
                result = {}
                for k, v in any_value.to_dict():
                    result[k] = make_serializable(v)
                return result
            elif hasattr(any_value, '__dict__'):
                result = {}
                for k, v in any_value.__dict__.items():
                    if not k.startswith('_'):
                        result[k] = make_serializable(v)
                return result
            return str(any_value)

        # Process nodes
        node_id_map = {}  # Map original node to string ID

        for node, data in graph.nodes(data=True):
            node_id = data.get('name', str(node))
            node_id_map[node] = node_id

            # Build node data
            node_data = {
                'id': node_id,  # Cytoscape requires 'id'
                'name': data.get('name', data.get('label', str(node))),
                'type': data.get('type', 'not set')
            }

            # Add all other attributes
            for key, value in data.items():
                if key not in ['name', 'type', 'label']:
                    if not node_labels or key in node_labels:
                        node_data[key] = make_serializable(value)

            # Apply color if type mapping provided
            if type_color_map and node_data['type'] in type_color_map:
                node_data['color'] = type_color_map[node_data['type']]
            else:
                # Default coloring
                node_data['color'] = '#999'

            # Add to elements
            json_data['elements']['nodes'].append({
                'data': node_data
            })

        # Process edges
        is_multigraph = isinstance(graph, (nx.MultiGraph, nx.MultiDiGraph))
        edge_count = {}  # Track multiple edges between same nodes

        if is_multigraph:
            edge_iterator = graph.edges(data=True, keys=True)
        else:
            edge_iterator = ((u, v, 0, d) for u, v, d in graph.edges(data=True))

        for source, target, edge_key, data in edge_iterator:
            source_id = node_id_map[source]
            target_id = node_id_map[target]

            # Create unique edge ID
            edge_pair = f"{source_id}_{target_id}"
            if edge_pair in edge_count:
                edge_count[edge_pair] += 1
                edge_id = f"{edge_pair}_{edge_count[edge_pair]}"
            else:
                edge_count[edge_pair] = 0
                edge_id = edge_pair

            # Build edge data
            edge_data = {
                'id': edge_id,
                'source': source_id,
                'target': target_id,
                'name': data.get('name', data.get('label', '')),
                'type': data.get('type', 'not set')
            }

            # Add all other attributes
            for key, value in data.items():
                if key not in ['name', 'type', 'label']:
                    if not edge_labels or key in edge_labels:
                        edge_data[key] = make_serializable(value)

            # Apply color if type mapping provided
            if type_color_map and edge_data['type'] in type_color_map:
                edge_data['color'] = type_color_map[edge_data['type']]
            else:
                edge_data['color'] = '#999'

            # Add to elements
            json_data['elements']['edges'].append({
                'data': edge_data,
                'classes': 'multiple' if edge_count[edge_pair] > 0 else ''
            })

        return json_data