"""
Client module for connecting to the visualization server using ZeroMQ.

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
    """
    Client for sending graph data to the visualization server.

    This class handles the connection to a running Schnauzer visualization server
    and provides methods to convert and send NetworkX graph data for display.
    The client uses ZeroMQ REQ-REP pattern for communication.

    Attributes:
        host (str): Hostname or IP address of the visualization server.
        port (int): Port number the server is listening on.
        context (zmq.Context): ZeroMQ context for socket creation.
        socket (zmq.Socket): ZeroMQ REQ socket for communication.
        connected (bool): Connection status flag.

    Examples:
        >>> import networkx as nx
        >>> from schnauzer import VisualizationClient
        >>>
        >>> # Create a graph
        >>> G = nx.DiGraph()
        >>> G.add_edge("A", "B")
        >>> G.add_edge("B", "C")
        >>>
        >>> # Send to visualization server
        >>> client = VisualizationClient()
        >>> client.send_graph(G, title="My Graph")
    """

    def __init__(self, host='localhost', port=8086, log_level = logging.INFO):
        """
        Initialize the visualization client.

        Creates a ZeroMQ context and prepares for connection to the server.
        The actual connection is established lazily on first send.

        Args:
            host (str, optional): Hostname or IP address of the visualization server.
                Defaults to 'localhost'.
            port (int, optional): Port number the server is listening on.
                Defaults to 8086.
            log_level (int, optional): Logging level for this client.
                Defaults to logging.INFO.

        Note:
            The client automatically registers cleanup on program exit to
            ensure proper socket closure.
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
        """
        Establish a non-blocking connection to the visualization server.

        Creates a ZeroMQ REQ socket and connects to the server. Sets a 5-second
        timeout for future operations to prevent indefinite blocking.

        Returns:
            bool: True if connection was successful, False otherwise.

        Note:
            This method is called automatically by send_graph() if not already
            connected. Users typically don't need to call this directly.
        """
        if self.connected:
            return True

        try:
            self.socket = self.context.socket(zmq.REQ)
            self.socket.setsockopt(zmq.LINGER, 0)
            self.socket.setsockopt(zmq.RCVTIMEO, 5000)

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
        """
        Close the connection to the visualization server.

        Properly closes the ZeroMQ socket and terminates the context.
        This method is automatically called on program exit but can
        also be called manually if needed.

        Note:
            Safe to call multiple times - subsequent calls have no effect.
        """
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

    def send_graph(self, graph: networkx.Graph, title=None, traces=None):
        """
        Send NetworkX graph data to the visualization server.

        Converts the NetworkX graph to Cytoscape.js format and sends it
        to the visualization server for rendering. The graph will be
        displayed in the web interface with interactive features.

        Args:
            graph (networkx.Graph): NetworkX graph object to visualize.
                Can be Graph, DiGraph, MultiGraph, or MultiDiGraph.
            title (str, optional): Title to display above the graph.
                Defaults to 'NetworkX Graph Visualization with Cytoscape'.
            traces (dict, optional): Optional trace data for edge
                origin tracking. Used for graph analysis features.

        Returns:
            bool: True if graph was successfully sent, False if there was
                an error connecting or sending.

        Examples:
            >>> # Simple graph
            >>> G = nx.karate_club_graph()
            >>> client.send_graph(G, title="Club Network")

            >>> # Directed graph with attributes
            >>> DG = nx.DiGraph()
            >>> DG.add_node("A", color="#ff0000", size=20)
            >>> DG.add_node("B", color="#00ff00", size=30)
            >>> DG.add_edge("A", "B", weight=2.5, color="#0000ff")
            >>> client.send_graph(DG, title="Colored Graph")
        """
        if not self.connected:
            success = self._connect()
            if not success:
                return False

        # Convert to GraphML string using NetworkX built-in
        cytoscape_data = nx.cytoscape_data(graph)
        cytoscape_data['title'] = title or 'NetworkX Graph Visualization with Cytoscape'
        if traces:
            cytoscape_data['traces'] = traces


        try:
            self.socket.send_string(json.dumps(cytoscape_data))
            ack = self.socket.recv_string()
            log.debug(f"Server response: {ack}")
            return True
        except zmq.error.ZMQError as e:
            log.error(f"Error sending graph data: {e}")
            return False