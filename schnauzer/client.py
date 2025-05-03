"""Client module for connecting to the visualization server using ZeroMQ."""
import zmq
import json
import atexit

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

    def send_graph(self, graph, title=None):
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

    def _convert_graph_to_json(self, graph):
        """Convert a networkx graph to a JSON-serializable format."""
        # Basic structure
        data = {
            'nodes': [],
            'links': []
        }

        # Add nodes
        for node_id in graph.nodes():
            node_data = {
                'id': str(node_id),
                'label': graph.nodes[node_id].get('label', str(node_id)),
                'type': graph.nodes[node_id].get('type', 'default'),
                'category': graph.nodes[node_id].get('category', 'default'),
                'description': graph.nodes[node_id].get('description', '')
            }
            data['nodes'].append(node_data)

        # Add links
        for source, target in graph.edges():
            link_data = {
                'source': str(source),
                'target': str(target)
            }
            data['links'].append(link_data)

        return data