"""
Single entry point — runs Flask and tcp_client in the same Python process
so they share plc_command_queue with zero IPC overhead.

Usage:
    python main.py
"""
import threading
import config
from server import app
from tcp_client import run_tcp_client


def start_flask():
    app.run(
        host=config.BACKEND_HOST,
        port=config.BACKEND_PORT,
        threaded=True,
        use_reloader=False,   # must be False when running in a thread
    )


if __name__ == "__main__":
    # Flask runs in a background thread
    flask_thread = threading.Thread(target=start_flask, daemon=True)
    flask_thread.start()
    print(f"Flask running on {config.BACKEND_HOST}:{config.BACKEND_PORT}", flush=True)

    # tcp_client runs on the main thread
    run_tcp_client(config.CAMERA_HOST, config.CAMERA_PORT)