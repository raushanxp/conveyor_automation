import os
import sys

# ── 1. Create Dummy Streams for Uvicorn ───────────────────────────────────
# Uvicorn expects standard output/error streams to exist. Applications
# run by Electron or compiled with PyInstaller's hidden console may not 
# provide these. We create dummy classes to discard output safely.
class DummyStream:
    def write(self, data):
        pass
    def flush(self):
        pass
    def isatty(self):
        return False

# Replace missing or invalid streams with our DummyStream
if not hasattr(sys.stdout, 'isatty') or sys.stdout is None:
    sys.stdout = DummyStream()
if not hasattr(sys.stderr, 'isatty') or sys.stderr is None:
    sys.stderr = DummyStream()

import logging
# Force python logging system to ignore unprintable terminal issues
logging.getLogger().handlers = []

import time
import uvicorn
import config
from api_server import app

def start_backend():
    print("INFO: Starting backend server for Conveyor system...")
    try:
        # Start the FastAPI uvicorn daemon
        uvicorn.run(
            app,
            host=config.API_HOST,
            port=config.API_PORT,
            log_level="error"  # Minimize logging overhead
        )
    except Exception as e:
        print(f"CRITICAL ERROR on backend startup: {e}")

if __name__ == "__main__":
    start_backend()
