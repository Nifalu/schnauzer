"""Client module for connecting to the visualization server using ZeroMQ."""
import zmq
import json
import atexit
import networkx

class VisualizationClient:
    """Client for sending graph data to the visualization server."""

    def __init__(self, host='localhost', port=8086):
        """Initialize the visualization client."""
        self.host = host
        self.port = port
        self.context = zmq.Context()
        self.socket = None
        self.connected = False

        # Register cleanup on exit
        atexit.register(self.disconnect)

    def connect(self):
        """Establish a non-blocking connection to the visualization server."""
        # Already connected? Just return
        if self.connected:
            return True

        try:
            # Create a ZeroMQ REQ socket
            self.socket = self.context.socket(zmq.REQ)
            self.socket.setsockopt(zmq.LINGER, 0)  # Don't wait on close
            self.socket.setsockopt(zmq.RCVTIMEO, 5000)  # 5 second timeout for future operations
            print(f"Trying to connect to visualization server at {self.host}:{self.port}")
            self.socket.connect(f"tcp://{self.host}:{self.port}")

            # ZeroMQ connect() is non-blocking by default
            print(f"Connected to visualization server at {self.host}:{self.port}")

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

    def send_graph(self, graph: networkx.Graph, title=None):
        """
        Send networkx graph data to the visualization server.

        Args:
            graph: A networkx graph object
            title: Optional title for the visualization
        """
        if not self.connected:
            success = self.connect()
            if not success:
                return False

        # Convert networkx graph to JSON-serializable format
        graph_data = self._convert_graph_to_json(graph)

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
            return self.connect() and self.send_graph(graph, title)
        except Exception as e:
            print(f"Unexpected error sending graph data: {e}")
            self.connected = False
            if self.socket:
                self.socket.close()
            self.socket = None
            return False

    # Modification for client.py _convert_graph_to_json method
    @staticmethod
    def _convert_graph_to_json(graph: networkx.Graph,
                               node_labels: list[str] = None,
                               edge_labels: list[str] = None):
        """
        Convert a networkx graph to a JSON-serializable format.
        Pass a label list if you want only specific labels to be visualized.
        """
        # Basic structure
        json_data = {
            'nodes': [],
            'edges': []
        }

        # Helper function to make values JSON serializable
        def make_serializable(any_value):
            if not any_value:
                raise ValueError("This should never be None here... should be checked before calling this")

            # return atomic values
            if isinstance(any_value, (str, int, float, bool)):
                return any_value

            # handle structured data
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


        try:
            # add nodes
            for node, data in graph.nodes(data=True):
                labels = {}
                for key, value in data.items():
                    if value and node_labels is not None and key in node_labels:
                        labels[key] = make_serializable(value)

                node_data = {
                    'id': str(node),
                    'name': data.get('name', data.get('label', str(node))), # Try to find a name or label
                    'labels': labels
                }
                json_data['nodes'].append(node_data)

            # Add edges:
            for source, target, data in graph.edges(data=True):
                labels = {}
                for key, value in data.items():
                    if value and edge_labels is not None and key in edge_labels:
                        labels[key] = make_serializable(value)

                link_data = {
                    'source': str(source),
                    'target': str(target),
                    'labels': labels
                }

                name = data.get('name', data.get('label'))
                if name:
                    link_data['name'] = name

                data['edges'].append(link_data)

        except Exception as e:
            print(f"Error converting graph to JSON: {e}")

        return json_data