"""
Schnauzer visualization web server module.

This module provides both a ZeroMQ backend for receiving NetworkX graph data
and a web frontend for interactive visualization. The server renders network graphs
using Cytoscape.js and provides interactive features like zooming, panning, and node details.
"""

from flask import Flask, render_template, jsonify, session
from flask_socketio import SocketIO, emit
import argparse
import os
import uuid
import sys
import threading
import zmq
import json
import time
import importlib.resources as pkg_resources
import logging

log = logging.getLogger(__name__)

class Server:
    """
    Combined web and visualization server for NetworkX graphs.

    This class handles both the ZeroMQ backend for receiving graph data
    and the web frontend for visualization. It creates two servers:
    1. A ZeroMQ REP server to receive graph data from clients
    2. A Flask/SocketIO web server to serve the interactive visualization

    The server maintains the current graph state and broadcasts updates
    to all connected web clients when new graph data is received.

    Attributes:
        web_port (int): Port number for the Flask web server.
        backend_port (int): Port number for the ZeroMQ backend listener.
        current_graph (dict): Current graph data in Cytoscape.js format.
        running (bool): Flag indicating if the backend server is running.
        context (zmq.Context): ZeroMQ context for socket creation.
        socket (zmq.Socket): ZeroMQ REP socket for receiving data.
        server_thread (threading.Thread): Thread running the backend server.
        app (Flask): Flask application instance.
        socketio (SocketIO): SocketIO instance for real-time updates.

    Examples:
        >>> from schnauzer import Server
        >>>
        >>> # Start server with default ports
        >>> server = Server()
        >>> server.start()  # Blocks until stopped

        >>> # Custom ports
        >>> server = Server(web_port=8080, backend_port=8086)
        >>> server.start()
    """

    def __init__(self, web_port=8080, backend_port=8086, log_level = logging.WARN):
        """
        Initialize the visualization server.

        Sets up both the Flask web application and prepares the ZeroMQ
        backend. The actual servers are started when start() is called.

        Args:
            web_port (int, optional): Port to run the web server on.
                Defaults to 8080. The web interface will be accessible
                at http://localhost:{web_port}/
            backend_port (int, optional): Port to listen for backend connections.
                Defaults to 8086. Clients send graph data to this port.
            log_level (int, optional): Logging level for the server.
                Defaults to logging.WARN.

        Note:
            Both ports must be available or the server will fail to start.
            The server automatically configures CORS to allow connections
            from any origin.
        """
        log.setLevel(log_level)
        self.web_port = web_port
        self.backend_port = backend_port
        self.current_graph = {
            'elements': {'nodes': [], 'edges': []},
            'title': 'NetworkX DiGraph Visualization'
        }

        # Backend server attributes
        self.running = False
        self.context = None
        self.socket = None
        self.server_thread = None

        # Web server attributes
        self.app = self._create_app()
        self.socketio = SocketIO(
            self.app,
            cors_allowed_origins="*",
            ping_timeout=60,         # Longer ping timeout for stability
            ping_interval=25,        # More frequent pings to maintain connection
            async_mode='threading'   # Thread mode for better stability
        )

        # Set up routes and socket handlers
        self._setup_routes()
        self._setup_socketio_handlers()


    @staticmethod
    def _create_app():
        """
        Create and configure the Flask application.

        Locates static and template files either from the development
        directory structure or from the installed package resources.
        Configures session security with a unique secret key.

        Returns:
            Flask: Configured Flask application instance ready to serve
                the web interface.

        Raises:
            SystemExit: If static and template files cannot be located.
                This typically happens if the package is incorrectly installed.

        Note:
            This method is static as it doesn't require instance state.
            It attempts multiple strategies to locate resources to work
            both in development and when installed as a package.
        """
        # Determine the location of static and template files
        try:
            # For development (works with the project structure)
            current_dir = os.path.dirname(os.path.abspath(__file__))
            static_folder = os.path.join(current_dir, "static")
            template_folder = os.path.join(current_dir, "templates")

            # Check if the folders exist
            if not os.path.exists(static_folder) or not os.path.exists(template_folder):
                raise FileNotFoundError

        except (FileNotFoundError, NameError):
            # For installed package (works with package resources)
            try:
                import schnauzer
                static_folder = pkg_resources.files('schnauzer') / 'static'
                template_folder = pkg_resources.files('schnauzer') / 'templates'
            except (ImportError, ModuleNotFoundError):
                log.error("Error: Could not locate static and template files")
                sys.exit(1)

        app = Flask(__name__,
                    static_folder=static_folder,
                    template_folder=template_folder)

        # Generate unique secret key for session security
        app.config['SECRET_KEY'] = str(uuid.uuid4())
        app.config['SESSION_TYPE'] = 'filesystem'

        return app


    def _setup_routes(self):
        """
        Set up Flask routes for the web interface.

        Configures the following HTTP endpoints:
        - / : Main visualization page
        - /graph-data : JSON endpoint for current graph data
        - /favicon.ico : Favicon for browser tabs

        Each client connection gets a unique session ID for tracking.

        Note:
            This method is called automatically during initialization.
            Routes are registered with the Flask app instance.
        """

        @self.app.route('/')
        def index():
            # Generate a unique session ID for each client
            if 'client_id' not in session:
                session['client_id'] = str(uuid.uuid4())
            return render_template('index.html', title=self.current_graph.get('title', 'Schnauzer Graph Visualization'))

        @self.app.route('/graph-data')
        def get_graph_data():
            """
            Endpoint to get current graph data.

            Returns:
                JSON: Current graph in Cytoscape.js format
            """
            return jsonify(self.current_graph)

        @self.app.route('/favicon.ico')
        def favicon():
            """
            Serve favicon from the root path for browsers that expect it there.

            Returns:
                Response: Favicon file
            """
            return self.app.send_static_file('favicon/favicon.ico')


    def _setup_socketio_handlers(self):
        """
        Set up SocketIO event handlers for real-time updates.

        Configures WebSocket event handlers for:
        - connect: Send current graph to newly connected clients
        - disconnect: Log client disconnection

        These handlers enable real-time graph updates without page refresh.

        Note:
            This method is called automatically during initialization.
            Handlers are registered with the SocketIO instance.
        """

        @self.socketio.on('connect')
        def handle_connect():
            # Send current graph data to new client
            log.info('Web client connected')
            emit('graph_update', self.current_graph)

        @self.socketio.on('disconnect')
        def handle_disconnect():
            log.info('Web client disconnected')


    def _on_graph_update(self):
        """
        Callback for when the graph is updated from a backend client.

        Broadcasts the new graph data to all connected web clients using
        SocketIO. This ensures all viewers see updates in real-time.

        Note:
            This method is called internally when new graph data is
            received on the ZeroMQ socket.
        """
        self.socketio.emit('graph_update', self.current_graph)
        log.info('Sent graph update to web clients')

    def start(self):
        """
        Start both the backend and web servers.

        This method starts the ZeroMQ backend server in a separate thread
        and then starts the Flask web server in the main thread. The method
        blocks until the web server is stopped.

        The web interface becomes accessible at http://localhost:{web_port}/
        and clients can send data to the backend port.

        Note:
            This method blocks the calling thread. To stop the server,
            use Ctrl+C or call stop() from another thread.

        Examples:
            >>> server = Server()
            >>> server.start()  # Blocks here
            Starting visualization server at http://localhost:8080/
            Backend listener running on port 8086
        """
        if self.running:
            return

        # Start the backend server
        self.running = True
        self.context = zmq.Context()

        # Start the server thread
        self.server_thread = threading.Thread(target=self._run_backend_server)
        self.server_thread.daemon = True
        self.server_thread.start()

        # Start the web server in the main thread
        print("="*50)
        print(f"Starting visualization server at http://localhost:{self.web_port}/")
        print(f"Backend listener running on port {self.backend_port}")
        print("="*50)

        # Run Flask server (this blocks until the server is stopped)
        self.socketio.run(
            self.app,
            host='0.0.0.0',  # Allow connections from other machines
            port=self.web_port,
            debug=False,
            use_reloader=False,
            allow_unsafe_werkzeug=True
        )


    def _run_backend_server(self):
        """
        Run the backend ZeroMQ server in a background thread.

        This method listens for incoming graph data on the ZeroMQ socket
        and updates the graph when new data is received. It handles:
        - Connection handshakes ("HELLO" messages)
        - Graph data updates (JSON formatted Cytoscape.js data)
        - Error recovery for malformed messages

        The server uses a REQ-REP pattern, so it always sends a response
        for each received message to maintain socket synchronization.

        Note:
            This method runs in a separate thread and continues until
            self.running is set to False. It includes error handling to
            prevent the thread from crashing on bad input.
        """
        # Create a ZeroMQ REP socket
        self.socket = self.context.socket(zmq.REP)
        self.socket.bind(f"tcp://*:{self.backend_port}")

        while self.running:
            try:
                # Wait for next request from client (non-blocking when running)
                message = self.socket.recv_string(flags=zmq.NOBLOCK if self.running else 0)

                # Simple handshake for connection testing
                if message == "HELLO":
                    self.socket.send_string("Connected to visualization server")
                    continue

                try:
                    message_data = json.loads(message)

                    # Handle the new format - cytoscape data is sent directly
                    self.current_graph = message_data

                    # Ensure we have a title
                    if 'title' not in self.current_graph:
                        self.current_graph['title'] = 'NetworkX Graph Visualization'

                    # Broadcast the update to web clients
                    self._on_graph_update()

                    # Send acknowledgement
                    self.socket.send_string("Update received")

                except json.JSONDecodeError as e:
                    log.error(f"Invalid JSON received: {e}")
                    # Send error response to keep socket in sync
                    self.socket.send_string("Error: Invalid JSON")

                except KeyError as e:
                    log.error(f"Missing expected key in message: {e}")
                    # Send error response to keep socket in sync
                    self.socket.send_string(f"Error: Missing key {e}")

                except Exception as e:
                    log.error(f"Error processing message: {e}")
                    # Send error response to keep socket in sync
                    self.socket.send_string(f"Error: {e}")

            except zmq.error.Again:
                # No message available, sleep briefly to prevent CPU hogging
                time.sleep(0.1)
                continue

            except Exception as e:
                log.error(f"Error in server loop: {e}")
                time.sleep(0.1)  # Wait a bit before continuing

        # Cleanup when stopping
        if self.socket:
            self.socket.close()
        print("Backend listener stopped")


    def stop(self):
        """
        Stop both the backend and web servers.

        This method safely stops the ZeroMQ server thread and cleans up
        resources. It:
        1. Sets the running flag to False to stop the backend thread
        2. Closes the ZeroMQ socket
        3. Terminates the ZeroMQ context

        Note:
            Safe to call multiple times. The web server typically needs
            to be stopped with Ctrl+C as it runs in the main thread.
        """
        self.running = False
        time.sleep(0.2)  # Give the thread time to exit gracefully

        if self.socket:
            self.socket.close()
            self.socket = None

        if self.context:
            self.context.term()
            self.context = None


def main():
    """
    Parse command line arguments and start the server.

    This function is the entry point when running the server directly.
    It provides a command-line interface for starting the server with
    custom port configurations.

    Command-line arguments:
        --port: Web server port (default: 8080)
        --backend-port: Backend listener port (default: 8086)

    Returns:
        Server: The created server instance (though it blocks on start()).

    Examples:
        From command line:
        $ python -m schnauzer.server
        $ python -m schnauzer.server --port 9000 --backend-port 9001
    """
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='NetworkX Graph Visualization Server')
    parser.add_argument('--port', type=int, default=8080,
                      help='Port to run the web server on (default: 8080)')
    parser.add_argument('--backend-port', type=int, default=8086,
                      help='Port to listen for backend connections (default: 8086)')

    args = parser.parse_args()

    # Create and start the server
    server = Server(web_port=args.port, backend_port=args.backend_port)
    server.start()

    return server


if __name__ == '__main__':
    main()