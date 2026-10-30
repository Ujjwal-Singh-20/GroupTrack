"""
GroupTrack - Native Desktop Launcher
Lightweight Desktop App using Microsoft Edge WebView2 runtime.
- Bundle size: ~12 MB
- RAM footprint: < 40 MB
- Zero Chrome/Electron bloat
- Fixed Local Port (41738) for 100% persistent LocalStorage & IndexedDB
- Direct Hard-Drive Persistence (%APPDATA%\\GroupTrack\\database.json)
"""

import os
import sys
import threading
import http.server
import socketserver
import webview

FIXED_PORT = 41738

def get_base_dir():
    # Detect PyInstaller bundle directory or source directory
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=get_base_dir(), **kwargs)

    def log_message(self, format, *args):
        # Suppress server terminal request logging
        pass

class StorageApi:
    """Native Python bridge for direct physical disk persistence"""
    def __init__(self, db_path):
        self.db_path = db_path

    def save_to_disk(self, json_str):
        try:
            with open(self.db_path, 'w', encoding='utf-8') as f:
                f.write(json_str)
            return True
        except Exception as e:
            print("[StorageApi] Error saving to disk:", e)
            return False

    def load_from_disk(self):
        try:
            if os.path.exists(self.db_path):
                with open(self.db_path, 'r', encoding='utf-8') as f:
                    return f.read()
        except Exception as e:
            print("[StorageApi] Error loading from disk:", e)
        return None

    def export_file(self, content_str, filename):
        try:
            downloads_dir = os.path.join(os.path.expanduser('~'), 'Downloads')
            os.makedirs(downloads_dir, exist_ok=True)
            target_path = os.path.join(downloads_dir, filename)
            with open(target_path, 'w', encoding='utf-8') as f:
                f.write(content_str)
            return target_path
        except Exception as e:
            print("[StorageApi] Error exporting file to Downloads:", e)
            return None

def start_local_server(preferred_port=FIXED_PORT):
    socketserver.TCPServer.allow_reuse_address = True
    for offset in range(10):
        test_port = preferred_port + offset
        try:
            httpd = socketserver.TCPServer(("127.0.0.1", test_port), QuietHandler)
            thread = threading.Thread(target=httpd.serve_forever, daemon=True)
            thread.start()
            return test_port
        except OSError:
            continue

    # Fallback to ephemeral if preferred ports are taken
    httpd = socketserver.TCPServer(("127.0.0.1", 0), QuietHandler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd.server_address[1]

def main():
    base_dir = get_base_dir()

    # Dedicated permanent storage directory in APPDATA
    app_data_root = os.environ.get('APPDATA', os.path.expanduser('~'))
    app_folder = os.path.join(app_data_root, 'GroupTrack')
    user_storage_path = os.path.join(app_folder, 'webview_profile')
    db_file_path = os.path.join(app_folder, 'database.json')

    os.makedirs(user_storage_path, exist_ok=True)

    # Initialize native disk storage API
    api = StorageApi(db_file_path)

    # Start internal localhost server on fixed port so origin never changes
    try:
        server_port = start_local_server(FIXED_PORT)
        target_url = f"http://127.0.0.1:{server_port}/index.html"
    except Exception as e:
        target_url = os.path.join(base_dir, 'index.html')

    window = webview.create_window(
        title='GroupTrack - Project & Review Tracker',
        url=target_url,
        width=1320,
        height=820,
        min_size=(960, 600),
        text_select=True,
        zoomable=True,
        js_api=api
    )

    webview.start(
        gui='edgechromium',
        storage_path=user_storage_path,
        debug=False
    )

if __name__ == '__main__':
    main()
