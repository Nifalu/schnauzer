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

    def __init__(self, host='localhost', port=8086, log_level = logging.INFO):
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

    def send_graph(self, graph: networkx.Graph, title=None, lineage=None):
        """Send networkx graph data to the visualization server."""
        if not self.connected:
            success = self._connect()
            if not success:
                return False

        # Convert to GraphML string using NetworkX built-in
        cytoscape_data = nx.cytoscape_data(graph)
        cytoscape_data['title'] = title or 'NetworkX Graph Visualization with Cytoscape'
        if lineage:
            cytoscape_data['lineage'] = lineage


        try:
            self.socket.send_string(json.dumps(cytoscape_data))
            ack = self.socket.recv_string()
            print(f"Server response: {ack}")
            return True
        except zmq.error.ZMQError as e:
            print(f"Error sending graph data: {e}")
            return False