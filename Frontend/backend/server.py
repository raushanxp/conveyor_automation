from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

expected_box_count = 6

latest_qr_state = {
    "qr_codes": [],
    "complete": False,
    "error": None,
    "missing": 0,
    "extra": 0
}

# Conveyor command store — tcp_client polls this and acts on it
pending_conveyor_command = None


# ── CONVEYOR CONTROL ──
# React posts here → Flask stores command → tcp_client picks it up
@app.route('/api/conveyor', methods=['POST', 'OPTIONS'])
def control_conveyor():
    global pending_conveyor_command
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200
    data = request.json or {}
    command = data.get('command')
    if command not in [0, 1]:
        return jsonify({"success": False, "error": "Invalid command"}), 400
    pending_conveyor_command = command
    print(f"Conveyor command queued: {'START' if command == 0 else 'STOP'}", flush=True)
    return jsonify({"success": True})


# tcp_client polls this to get pending commands from React
@app.route('/api/conveyor/pending', methods=['GET'])
def get_pending_conveyor():
    global pending_conveyor_command
    cmd = pending_conveyor_command
    pending_conveyor_command = None  # clear after reading
    return jsonify({"command": cmd})


# ── QR BRIDGE ──
@app.route('/api/qr', methods=['GET', 'POST', 'DELETE'])
def handle_qr():
    global latest_qr_state

    if request.method == 'GET':
        return jsonify(latest_qr_state)

    elif request.method == 'POST':
        data = request.json or {}
        latest_qr_state = {
            "qr_codes": data.get('qr_codes', []),
            "complete": data.get('complete', False),
            "error":    data.get('error', None),
            "missing":  data.get('missing', 0),
            "extra":    data.get('extra', 0),
        }
        print(f"QR state: {len(latest_qr_state['qr_codes'])} codes, complete={latest_qr_state['complete']}, error={latest_qr_state['error']}", flush=True)
        return jsonify({"success": True})

    elif request.method == 'DELETE':
        latest_qr_state = {"qr_codes": [], "complete": False, "error": None, "missing": 0, "extra": 0}
        print("QR state cleared", flush=True)
        return jsonify({"success": True})


# ── STACK SIZE ──
@app.route('/api/stack-size', methods=['GET', 'POST'])
def handle_stack_size():
    global expected_box_count
    if request.method == 'POST':
        data = request.json or {}
        size = data.get('stack_size')
        if not size or not isinstance(size, int) or size < 1:
            return jsonify({"success": False, "error": "Invalid stack_size"}), 400
        expected_box_count = size
        print(f"Stack size set to: {expected_box_count}", flush=True)
        return jsonify({"success": True, "stack_size": expected_box_count})
    else:
        return jsonify({"stack_size": expected_box_count})


# ── PAYLOAD (backwards compat) ──
@app.route('/api/payload', methods=['GET', 'POST'])
def handle_payload():
    global expected_box_count
    if request.method == 'POST':
        data = request.json or {}
        count = data.get('box_count')
        if not count or not isinstance(count, int) or count < 1:
            return jsonify({"success": False, "error": "Invalid box_count"}), 400
        expected_box_count = count
        return jsonify({"success": True, "expected_box_count": expected_box_count})
    else:
        return jsonify({
            "expected_box_count": expected_box_count,
            "actual_box_count": len(latest_qr_state["qr_codes"]),
        })


if __name__ == "__main__":
    print("PLC Bridge running on port 5000")
    app.run(host='0.0.0.0', port=5000)