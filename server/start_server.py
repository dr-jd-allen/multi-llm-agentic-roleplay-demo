#!/usr/bin/env python3
"""
Simple HTTP server to run the Multi-AI Conversation System GUI
"""

import http.server
import socketserver
import os
import webbrowser
import sys

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add headers to allow JavaScript modules to work
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    # Change to the script's directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    Handler = MyHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"Server started at http://localhost:{PORT}")
            print("Opening browser...")
            
            # Try to open the browser
            webbrowser.open(f'http://localhost:{PORT}')
            
            print(f"\nServing at port {PORT}")
            print("Press Ctrl+C to stop the server")
            
            httpd.serve_forever()
            
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"Port {PORT} is already in use.")
            print("Trying alternate port...")
            PORT_ALT = 8001
            
            with socketserver.TCPServer(("", PORT_ALT), Handler) as httpd:
                print(f"Server started at http://localhost:{PORT_ALT}")
                webbrowser.open(f'http://localhost:{PORT_ALT}')
                print(f"\nServing at port {PORT_ALT}")
                print("Press Ctrl+C to stop the server")
                httpd.serve_forever()
        else:
            raise
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)

if __name__ == "__main__":
    main()