import socket
import struct
import requests
import threading
from urllib.parse import urlparse, parse_qs

API_URL        = "https://leader.salaryslip.co/api/webbook/write"
LOCAL_BRIDGE_URL = "http://127.0.0.1:5000/api/qr"
STACK_SIZE_URL   = "http://127.0.0.1:5000/api/stack-size"
PENDING_CMD_URL  = "http://127.0.0.1:5000/api/conveyor/pending"

PLC_IP   = "192.168.0.40"
PLC_PORT = 502

cached_stack_size = 6
plc_sock = None
plc_lock = threading.Lock()


# ── PLC ──────────────────────────────────────────────

def connect_plc():
    global plc_sock
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2.0)
        s.connect((PLC_IP, PLC_PORT))
        s.settimeout(None)
        plc_sock = s
        print("PLC connected (persistent)", flush=True)
        return True
    except Exception as e:
        print(f"PLC connect failed: {e}", flush=True)
        plc_sock = None
        return False


def send_plc(value: int):
    """Send value 0 (start) or 1 (stop) to PLC register 40001."""
    global plc_sock
    packet = struct.pack('>HHHBBHH', 0, 0, 6, 1, 6, 0, value)
    with plc_lock:
        for attempt in range(2):
            try:
                if plc_sock is None:
                    if not connect_plc():
                        continue
                plc_sock.sendall(packet)
                plc_sock.recv(1024)
                label = "STARTED" if value == 0 else "STOPPED"
                print(f"PLC {label}", flush=True)
                return True
            except Exception as e:
                print(f"PLC send failed (attempt {attempt+1}): {e}", flush=True)
                try: plc_sock.close()
                except: pass
                plc_sock = None
    return False


# ── BACKGROUND THREADS ───────────────────────────────

def refresh_stack_size_background():
    """Poll stack size from Flask every 2s. Never blocks the main loop."""
    global cached_stack_size
    while True:
        try:
            res = requests.get(STACK_SIZE_URL, timeout=2)
            if res.status_code == 200:
                size = int(res.json().get("stack_size", 0))
                if size > 0 and size != cached_stack_size:
                    cached_stack_size = size
                    print(f"Stack size updated: {cached_stack_size}", flush=True)
        except Exception:
            pass
        threading.Event().wait(2)


def poll_manual_commands_background():
    """
    Poll Flask for manual Start/Stop commands sent by React buttons.
    Runs every 200ms so manual button response is near-instant.
    """
    while True:
        try:
            res = requests.get(PENDING_CMD_URL, timeout=1)
            if res.status_code == 200:
                cmd = res.json().get("command")
                if cmd is not None:
                    send_plc(cmd)
        except Exception:
            pass
        threading.Event().wait(0.2)


# ── HELPERS ──────────────────────────────────────────

def extract_qr_value(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("http://") or raw.startswith("https://"):
        try:
            parsed = urlparse(raw)
            params = parse_qs(parsed.query)
            if "qr" in params:
                return params["qr"][0]
        except Exception:
            pass
    return raw


def notify_react(qr_codes, complete=False, error=None, missing=0, extra=0):
    payload = {"qr_codes": qr_codes}
    if complete:
        payload["complete"] = True
    if error:
        payload["error"]   = error
        payload["missing"] = missing
        payload["extra"]   = extra
    try:
        requests.post(LOCAL_BRIDGE_URL, json=payload, timeout=2)
    except Exception:
        pass


def post_to_cloud_api(payload: str):
    try:
        response = requests.post(API_URL, json={"data": payload}, timeout=5)
        if response.status_code != 200:
            print(f"API error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Failed to send to API: {e}")


# ── MAIN ─────────────────────────────────────────────

def run_tcp_client(host, port):
    connect_plc()
    threading.Thread(target=refresh_stack_size_background, daemon=True).start()
    threading.Thread(target=poll_manual_commands_background, daemon=True).start()

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        print(f"Connecting to scanner at {host} port {port}...")
        sock.connect((host, port))
        print("Scanner connected.")

        while True:
            data = sock.recv(4096)
            if not data:
                print("Server closed connection.")
                break

            try:
                decoded_buffer = data.decode("utf-8")
            except UnicodeDecodeError:
                decoded_buffer = data.decode("utf-8", errors="ignore")

            raw_codes = [c.strip() for c in decoded_buffer.replace('\n', ';').split(';') if c.strip()]
            raw_codes = [c for c in raw_codes if c.lower() != "noread"]
            codes = [extract_qr_value(c) for c in raw_codes]

            if not codes:
                continue

            stack_size = cached_stack_size
            count = len(codes)

            print(f"Packet: {count} QR(s), expected: {stack_size}", flush=True)

            if count == stack_size:
                print(f"✅ Stack of {stack_size} complete — belt continues", flush=True)
                for code in codes:
                    print(f"  QR: {code}", flush=True)
                    post_to_cloud_api(code)
                notify_react(codes, complete=True)

            else:
                missing = max(0, stack_size - count)
                extra   = max(0, count - stack_size)
                print(f"❌ MISMATCH: got {count}, expected {stack_size} | missing={missing} extra={extra}", flush=True)
                send_plc(1)   # stop — persistent socket, no handshake delay
                for code in codes:
                    print(f"  QR: {code}", flush=True)
                    post_to_cloud_api(code)
                notify_react(codes, error="mismatch", missing=missing, extra=extra)

    except KeyboardInterrupt:
        print("Client stopped by user.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        print("Closing socket.")
        sock.close()
        with plc_lock:
            if plc_sock:
                try: plc_sock.close()
                except: pass


if __name__ == "__main__":
    HOST = "192.168.0.78"
    PORT = 2002
    run_tcp_client(HOST, PORT)