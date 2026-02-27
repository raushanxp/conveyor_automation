#!/bin/bash
# ── Conveyor Automation — Start All Services ──
# Usage: ./start.sh

trap 'echo ""; echo "🛑 Shutting down all services..."; kill $(jobs -p) 2>/dev/null; wait; echo "✅ All services stopped."; exit' INT TERM

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Starting Conveyor Automation System..."
echo "   Backend:  $DIR/backend"
echo "   Frontend: $DIR"
echo ""

# Start backend services
cd "$DIR/backend"
python3 server.py &
echo "  ✅ Flask PLC Bridge       (port 5000)"
python3 tcp_client.py &
echo "  ✅ QR Scanner TCP Client"
python3 ftp_server.py &
echo "  ✅ FTP Camera Server      (port 2005)"
python3 api_server.py &
echo "  ✅ Camera Image API       (port 8000)"

echo ""

# Start frontend
cd "$DIR"
echo "  ✅ React Dev Server       (port 5173)"
echo ""
npm run dev

# Wait for all background processes
wait
