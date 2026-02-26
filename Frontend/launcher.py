import subprocess
import sys
import time

# List of scripts to run
scripts = [
    "server.py",
    "api_server.py",
    "ftp_server.py",
    "tcp_client.py" # Client starts last so servers are ready
]

processes = []

print("🚀 Starting all Lux WMS background services...\n")

for script in scripts:
    print(f"➡️ Launching {script}...")
    # Start each script in the background
    p = subprocess.Popen([sys.executable, script])
    processes.append(p)
    time.sleep(1) # 1 second delay between starts

print("\n✅ All services are running together!")
print("🛑 Press CTRL+C here to stop all of them at once.\n")

try:
    # Keep the master script alive
    for p in processes:
        p.wait()
except KeyboardInterrupt:
    print("\n🛑 Shutting down all services...")
    for p in processes:
        p.terminate()
    print("✅ System completely stopped.")