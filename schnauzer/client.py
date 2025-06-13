"""Client module for connecting to the visualization server using ZeroMQ.

This module provides a client interface to send NetworkX graph data to the
Schnauzer visualization server for interactive rendering.
"""
import \
    networkx as nx
import zmq
import json
import atexit
import networkx

class VisualizationClient:
    """Client for sending graph data to the visualization server.

    This class handles the connection to a running Schnauzer visualization server
    and provides methods to convert and send NetworkX graph data for display.
    """

    def __init__(self, host='localhost', port=8086):
        """Initialize the visualization client.

        Args:
            host (str): Hostname or IP address of the visualization server
            port (int): Port number the server is listening on
        """
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

            print(f"Trying to connect to visualization server at {self.host}:{self.port} ... ", end = '')
            self.socket.connect(f"tcp://{self.host}:{self.port}")
            print("Success!")

            self.connected = True
            return True
        except zmq.error.ZMQError as e:
            print(f"Could not create socket: {e}")
            self.socket = None
            return False

    def disconnect(self):
        """Close the connection to the visualization server."""
        if self.socket:
            try:
                self.socket.close()
                print("Disconnected from visualization server")
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

        This method converts a NetworkX graph to a JSON format suitable for
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

        # Convert networkx graph to JSON-serializable format
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
            print(f"Server response: {ack}")

            return True
        except zmq.error.ZMQError as e:
            print(f"Error sending graph data: {e}")
            self.connected = False
            if self.socket:
                self.socket.close()
            self.socket = None
            # Try to reconnect once
            return self._connect() and self.send_graph(graph, title)
        except Exception as e:
            print(f"Unexpected error sending graph data: {e}")
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
        """Convert a NetworkX graph to a JSON-serializable format.

        Args:
            graph (networkx.Graph): The graph to convert
            node_labels (list[str], optional): List of node attributes to include
            edge_labels (list[str], optional): List of edge attributes to include
            type_color_map (dict[str, str], optional): Mapping of node/edge types to colors

        Returns:
            dict: JSON-serializable structure representing the graph
        """
        # Basic structure
        json_data = {
            'nodes': [],
            'edges': []
        }

        # Helper function to make values JSON serializable
        def make_serializable(any_value):
            """Convert any Python value to a JSON-serializable format."""
            if not any_value:
                return "None"

            # Return atomic values
            if isinstance(any_value, (str, int, float, bool)):
                return any_value

            # Handle structured data
            elif hasattr(any_value, 'to_dict') and callable(any_value.to_dict):
                result = {}
                for k, v in any_value.to_dict():
                    result[k] = make_serializable(v)
                return result

            elif hasattr(any_value, '__dict__'):
                # Extract meaningful attributes for better representation
                result = {}
                for k, v in any_value.__dict__.items():
                    if not k.startswith('_'):  # Skip private attributes
                        result[k] = make_serializable(v)
                return result

            # Default fallback
            return str(any_value)

        # Track relationships between nodes for parent/child references
        node_map = {}

        # Process nodes
        for node, data in graph.nodes(data=True):
            labels = {}
            for key, value in data.items():
                if key in ['name', 'type']:
                    continue  # Store these separately
                if node_labels and key in node_labels:  # Add selected labels only
                    labels[key] = make_serializable(value)
                else:  # Add all labels
                    labels[key] = make_serializable(value)

            node_data = {
                'name': data.get('name', data.get('label', str(node))),  # Try to find a name or label
                'type': data.get('type', 'not set'),
                'labels': labels,
                'parents': [],
                'children': []
            }
            node_map[str(node)] = node_data
            json_data['nodes'].append(node_data)

        # Process edges
        is_multigraph = isinstance(graph, (nx.MultiGraph, nx.MultiDiGraph))

        if is_multigraph:
            edge_iterator = graph.edges(data=True, keys=True)
        else:
            edge_iterator = ((u, v, 0, d) for u, v, d in graph.edges(data=True))

        for source, target, edge_key, data in edge_iterator:
            source_id = str(source)
            target_id = str(target)

            # Add relationship data
            if source_id in node_map and target_id in node_map:
                # Add target to source's children
                source_node = node_map[source_id]
                target_node = node_map[target_id]

                source_node['children'].append({
                    'id': target_id,
                    'name': target_node['name']
                })

                # Add source to target's parents
                target_node['parents'].append({
                    'id': source_id,
                    'name': source_node['name']
                })

            # Process edge labels
            labels = {}
            for attr_key, value in data.items():
                if attr_key in ['name', 'type']:
                    continue  # Store these separately
                if edge_labels and attr_key in edge_labels:  # Add selected labels only
                    labels[attr_key] = make_serializable(value)
                else:  # Add all labels
                    labels[attr_key] = make_serializable(value)

            link_data = {
                'name': data.get('name', data.get('label')),
                'type': data.get('type', 'not set'),
                'source': str(source),
                'target': str(target),
                'labels': labels
            }

            json_data['edges'].append(link_data)

        # Apply custom color mapping if provided
        if type_color_map:
            for node_data in json_data['nodes']:
                node_type = node_data.get('type')
                if node_type:
                    node_data['color'] = type_color_map.get(node_type, '#a3a3a3')  # Light gray default
            for edge_data in json_data['edges']:
                edge_type = edge_data.get('type')
                if edge_type:
                    edge_data['color'] = type_color_map.get(edge_type, '#a3a3a3')  # Light gray default

        else:
            # Determine node types based on connections
            for node_data in json_data['nodes']:
                if not node_data['parents'] and node_data['children']:
                    node_data['type'] = 'root'
                    node_data['color'] = '#FF0000'  # Red for root nodes
                elif node_data['parents'] and not node_data['children']:
                    node_data['type'] = 'leaf'
                    node_data['color'] = '#00FF00'  # Green for leaf nodes
                else:
                    node_data['type'] = 'normal'
                    node_data['color'] = '#0000FF'  # Blue for regular nodes
            for edge in json_data['edges']:
                edge['type'] = 'normal'
                edge['color'] = "#a3a3a3"  # Light gray for edges

        return json_data