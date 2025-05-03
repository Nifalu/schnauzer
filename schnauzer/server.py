"""Schnauzer visualization web server module."""
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

class Server:
    """
    Combined web and visualization server for NetworkX graphs.

    This class handles both the ZeroMQ backend for receiving graph data
    and the web frontend for visualization.
    """

    def __init__(self, web_port=8080, backend_port=8086):
        """
        Initialize the visualization server.

        Args:
            web_port (int): Port to run the web server on
            backend_port (int): Port to listen for backend connections
        """
        self.web_port = web_port
        self.backend_port = backend_port
        self.current_graph = {'nodes': [], 'links': [], 'title': 'NetworkX DiGraph Visualization'}

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
            ping_timeout=60,         # Longer ping timeout
            ping_interval=25,        # More frequent pings
            async_mode='threading'   # Thread mode for better stability
        )

        # Set up routes and socket handlers
        self._setup_routes()
        self._setup_socketio_handlers()

    def _create_app(self):
        """Create and configure the Flask application."""
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
                print("Error: Could not locate static and template files")
                sys.exit(1)

        app = Flask(__name__,
                    static_folder=static_folder,
                    template_folder=template_folder)

        app.config['SECRET_KEY'] = str(uuid.uuid4())  # Generate a new secret key on each restart
        app.config['SESSION_TYPE'] = 'filesystem'

        return app

    def _setup_routes(self):
        """Set up Flask routes."""
        @self.app.route('/')
        def index():
            # Generate a unique session ID for each client
            if 'client_id' not in session:
                session['client_id'] = str(uuid.uuid4())
            return render_template('index.html', title=self.current_graph.get('title', 'NetworkX DiGraph Visualization'))

        @self.app.route('/graph-data')
        def get_graph_data():
            """Endpoint to get current graph data."""
            return jsonify(self.current_graph)

    def _setup_socketio_handlers(self):
        """Set up SocketIO event handlers."""
        @self.socketio.on('connect')
        def handle_connect():
            print('Web client connected')
            # Send current graph data to new client
            emit('graph_update', self.current_graph)

        @self.socketio.on('disconnect')
        def handle_disconnect():
            print('Web client disconnected')

        @self.socketio.on('request_update')
        def handle_update_request(data):
            """Handle client request for updates."""
            print('Client requested update')
            emit('graph_update', self.current_graph)

    def _on_graph_update(self):
        """Callback for when the graph is updated from a backend."""
        self.socketio.emit('graph_update', self.current_graph)
        print("Broadcasted updated graph to web clients")

    def start(self):
        """Start both the backend and web servers."""
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
        print(f"Starting visualization server at http://localhost:{self.web_port}/")
        print(f"Backend listener running on port {self.backend_port}")

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
        """Run the backend ZeroMQ server in a background thread."""
        # Create a ZeroMQ REP socket
        self.socket = self.context.socket(zmq.REP)
        self.socket.bind(f"tcp://*:{self.backend_port}")

        print(f"Backend listener started on port {self.backend_port}")

        while self.running:
            try:
                # Wait for next request from client
                message = self.socket.recv_string(flags=zmq.NOBLOCK if self.running else 0)

                # Simple handshake for connection testing
                if message == "HELLO":
                    self.socket.send_string("Connected to visualization server")
                    continue

                try:
                    # Try to parse as JSON for graph data
                    graph_data = json.loads(message)

                    # Update the current graph
                    self.current_graph = graph_data

                    # Ensure title is present, use default if not provided
                    if 'title' not in self.current_graph:
                        self.current_graph['title'] = 'NetworkX DiGraph Visualization'

                    # Broadcast the update to web clients
                    self._on_graph_update()

                    print("Received graph update from backend")

                    # Send acknowledgement
                    self.socket.send_string("Update received")

                except json.JSONDecodeError as e:
                    print(f"Invalid JSON received: {e}")
                    self.socket.send_string(f"Error: Invalid JSON - {e}")

            except zmq.error.Again:
                # No message available, sleep briefly to prevent CPU hogging
                time.sleep(0.01)
                continue

            except Exception as e:
                print(f"Error in server loop: {e}")
                try:
                    self.socket.send_string(f"Error: {e}")
                except:
                    pass
                time.sleep(0.1)  # Wait a bit before continuing

        # Cleanup when stopping
        if self.socket:
            self.socket.close()
        print("Backend listener stopped")

    def stop(self):
        """Stop both the backend and web servers."""
        self.running = False
        time.sleep(0.2)  # Give the thread time to exit gracefully

        if self.socket:
            self.socket.close()
            self.socket = None

        if self.context:
            self.context.term()
            self.context = None

def main():
    """Parse command line arguments and start the server."""
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