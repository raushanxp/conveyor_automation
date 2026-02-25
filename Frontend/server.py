from flask import Flask, request, jsonify
from flask_cors import CORS
import socket
import struct
import time

app = Flask(__name__)
# Enable CORS so React can safely request this API
CORS(app)

PLC_IP = "192.168.0.40"
PLC_PORT = 502

# Global variables
plc_socket = None
# List to hold multiple scanned codes
scanned_qr_codes = [] 
# Expected number of boxes the worker will place on the conveyor
expected_box_count = 0

def connect_to_plc():
    """Establish a persistent connection to the PLC"""
    global plc_socket
    try:
        if plc_socket:
            plc_socket.close()
            
        print(f"⏳ Connecting to PLC at {PLC_IP}:{PLC_PORT}...")
        plc_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        # Set a short timeout so it doesn't hang forever if the PLC is offline
        plc_socket.settimeout(2.0)
        plc_socket.connect((PLC_IP, PLC_PORT))
        print("✅ SUCCESS: Persistent connection to PLC established!")
        return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        plc_socket = None
        return False

# Attempt to connect to PLC on startup
connect_to_plc()

def create_modbus_packet(value: int, unit_id=1):
    """Creates a Modbus TCP packet for Write Single Register"""
    transaction_id = 0
    protocol_id = 0
    length = 6
    function_code = 6
    register_addr = 0
    packet = struct.pack('>HHHBBHH', transaction_id, protocol_id, length, unit_id, function_code, register_addr, value)
    return packet

# ── ROUTE 1: PLC CONVEYOR CONTROL (WITH AUTO-RETRY) ──
@app.route('/api/conveyor', methods=['POST', 'OPTIONS'])
def control_conveyor():
    global plc_socket
    
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    data = request.json
    command = data.get('command')
    
    if command not in [0, 1]:
        return jsonify({"success": False, "error": "Invalid command"}), 400
        
    # We give the server exactly 2 attempts to send the command
    for attempt in range(2):
        if not plc_socket:
            if not connect_to_plc():
                return jsonify({"success": False, "error": "Cannot connect to PLC"}), 500

        try:
            packet = create_modbus_packet(command)
            plc_socket.sendall(packet)
            # Read the echo response from the PLC to clear the buffer
            plc_socket.recv(1024) 
            print(f"✅ SENT (MODBUS): Write {command} to Reg 40001")
            return jsonify({"success": True})
            
        except Exception as e:
            print(f"⚠️ Socket dead (Attempt {attempt + 1}) - Error: {e}. Reconnecting...")
            # If the socket died (WinError 10054), close it and set to None
            if plc_socket:
                try:
                    plc_socket.close()
                except:
                    pass
            plc_socket = None
            # Tiny delay before trying to reconnect on the 2nd loop
            time.sleep(0.1) 
            
    # If it fails twice in a row, then we actually throw the 500 error back to React
    return jsonify({"success": False, "error": "Lost connection to PLC"}), 500

# ── ROUTE 2: QR CODE SCANNER BRIDGE ──
@app.route('/api/qr', methods=['GET', 'POST', 'DELETE'])
def handle_qr():
    global scanned_qr_codes
    
    # NEW: When React sends a DELETE request, wipe the list
    if request.method == 'DELETE':
        scanned_qr_codes.clear()
        print("🧹 QR Queue cleared by React")
        return jsonify({"success": True, "message": "Queue cleared"})
        
    elif request.method == 'POST':
        data = request.json
        
        # Handle a single code (fallback)
        if data and 'qr_code' in data:
            new_code = data['qr_code']
            scanned_qr_codes.insert(0, new_code)
            print(f"📷 New QR Scanned: {new_code}")
            
        # Handle a batch array of codes from tcp_client.py
        if data and 'qr_codes' in data:
            # Reverse the batch so they show up in the correct chronological order in the UI
            for code in reversed(data['qr_codes']):
                scanned_qr_codes.insert(0, code)
            print(f"📷 Batch of {len(data['qr_codes'])} QRs Scanned")
            
        # INCREASED LIMIT: Keep up to 500 items so the array doesn't stop at 50 anymore!
        scanned_qr_codes = scanned_qr_codes[:500]
        
        return jsonify({"success": True})
        
    elif request.method == 'GET':
        # Return the entire list to React
        return jsonify({"qr_codes": scanned_qr_codes})

# ── ROUTE 3: PAYLOAD — SET/GET EXPECTED BOX COUNT ──
@app.route('/api/payload', methods=['POST', 'GET'])
def handle_payload():
    global expected_box_count

    if request.method == 'POST':
        data = request.json
        count = data.get('box_count')

        if count is None or not isinstance(count, int) or count < 1:
            return jsonify({"success": False, "error": "Invalid box_count. Must be a positive integer."}), 400

        expected_box_count = count
        print(f"📦 Payload set: expecting {expected_box_count} boxes on conveyor")
        return jsonify({"success": True, "expected_box_count": expected_box_count})

    elif request.method == 'GET':
        return jsonify({
            "expected_box_count": expected_box_count,
            "actual_box_count": len(scanned_qr_codes),
            "match": len(scanned_qr_codes) == expected_box_count
        })

if __name__ == "__main__":
    # Pointing to 0.0.0.0 allows React to connect via your network IP
    print("🚀 Python PLC Bridge running on port 5000")
    app.run(host='0.0.0.0', port=5000)