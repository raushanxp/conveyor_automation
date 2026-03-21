from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import threading
import config
from plc_queue import plc_command_queue

# Suppress Werkzeug's per-request HTTP access logs
logging.getLogger("werkzeug").setLevel(logging.ERROR)

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


# ── CONVEYOR CONTROL ─────────────────────────────────

@app.route('/api/conveyor', methods=['POST', 'OPTIONS'])
def control_conveyor():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200
    data = request.json or {}
    command = data.get('command')
    if command not in [0, 1]:
        return jsonify({"success": False, "error": "Invalid command"}), 400

    # Discard every stale command in the queue — only the latest matters.
    # Without this, rapid clicks pile up and execute one by one,
    # causing seconds of catch-up delay.
    while not plc_command_queue.empty():
        try:
            plc_command_queue.get_nowait()
        except Exception:
            break

    plc_command_queue.put(command)
    print(f"Conveyor command queued: {'START' if command == 0 else 'STOP'}", flush=True)
    return jsonify({"success": True})


# Kept for backwards compatibility — always returns None now.
@app.route('/api/conveyor/pending', methods=['GET'])
def get_pending_conveyor():
    return jsonify({"command": None})


# ── QR BRIDGE ────────────────────────────────────────
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
        return jsonify({"success": True})


# ── STACK SIZE ───────────────────────────────────────
@app.route('/api/stack-size', methods=['GET', 'POST'])
def handle_stack_size():
    global expected_box_count
    if request.method == 'POST':
        data = request.json or {}
        size = data.get('stack_size')
        if not size or not isinstance(size, int) or size < 1:
            return jsonify({"success": False, "error": "Invalid stack_size"}), 400
        expected_box_count = size
        return jsonify({"success": True, "stack_size": expected_box_count})
    else:
        return jsonify({"stack_size": expected_box_count})


# ── PAYLOAD (backwards compat) ───────────────────────
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
    app.run(
        host=config.BACKEND_HOST,
        port=config.BACKEND_PORT,
        threaded=True,
    )