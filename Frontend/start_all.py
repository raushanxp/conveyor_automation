import subprocess
import os
import signal
import sys
import time

# Get current directory (frontend folder)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")

processes = []

def start_process(command, cwd=None):
    process = subprocess.Popen(
        command,
        cwd=cwd,
        shell=True
    )
    processes.append(process)
    return process

def shutdown():
    print("\n🛑 Shutting down all services...")
    for p in processes:
        try:
            p.terminate()
        except:
            pass
    print("✅ All services stopped.")
    sys.exit(0)

signal.signal(signal.SIGINT, lambda sig, frame: shutdown())
signal.signal(signal.SIGTERM, lambda sig, frame: shutdown())

print("🚀 Starting Conveyor Automation System...")
print(f"   Backend:  {BACKEND_DIR}")
print(f"   Frontend: {BASE_DIR}")
print("")

# Use the same Python that's running this script (works on any PC)
PYTHON = sys.executable

# Start backend services
print("Starting backend services...\n")

start_process(f"{PYTHON} server.py", cwd=BACKEND_DIR)
print("  ✅ Flask PLC Bridge       (port 5000)")

start_process(f"{PYTHON} tcp_client.py", cwd=BACKEND_DIR)
print("  ✅ QR Scanner TCP Client")

start_process(f"{PYTHON} ftp_server.py", cwd=BACKEND_DIR)
print("  ✅ FTP Camera Server      (port 2005)")

start_process(f"{PYTHON} api_server.py", cwd=BACKEND_DIR)
print("  ✅ Camera Image API       (port 8000)")

print("\nStarting frontend...\n")

# Start React dev server
start_process("npm run dev", cwd=BASE_DIR)
print("  ✅ React Dev Server       (port 5173)")

print("\n🎯 All services started. Press Ctrl + C to stop.\n")

# Keep script running
while True:
    time.sleep(1)