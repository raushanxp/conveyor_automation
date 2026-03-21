import socket
import struct
import requests
import threading
import time
from urllib.parse import urlparse, parse_qs
import config
from plc_queue import plc_command_queue

API_URL          = "https://leader.salaryslip.co/api/webbook/write"
LOCAL_BRIDGE_URL = f"http://{config.BACKEND_HOST}:{config.BACKEND_PORT}/api/qr"
STACK_SIZE_URL   = f"http://{config.BACKEND_HOST}:{config.BACKEND_PORT}/api/stack-size"

PLC_IP   = config.PLC_IP
PLC_PORT = config.PLC_PORT

cached_stack_size = 6
plc_sock  = None
plc_lock  = threading.Lock()

_stack_size_session = requests.Session()
_notify_session     = requests.Session()


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
    global plc_sock
    packet = struct.pack('>HHHBBHH', 0, 0, 6, 1, 6, 0, value)
    with plc_lock:
        for attempt in range(2):
            try:
                if plc_sock is None:
                    if not connect_plc():
                        continue
                plc_sock.sendall(packet)
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

def drain_plc_queue_background():
    while True:
        try:
            command = plc_command_queue.get(timeout=0.01)
            while not plc_command_queue.empty():
                try:
                    command = plc_command_queue.get_nowait()
                except Exception:
                    break
            send_plc(command)
        except Exception:
            pass


def refresh_stack_size_background():
    global cached_stack_size
    while True:
        try:
            res = _stack_size_session.get(STACK_SIZE_URL, timeout=2)
            if res.status_code == 200:
                size = int(res.json().get("stack_size", 0))
                if size > 0 and size != cached_stack_size:
                    cached_stack_size = size
                    print(f"Stack size updated: {cached_stack_size}", flush=True)
        except Exception:
            pass
        time.sleep(2)


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

    def _send():
        try:
            _notify_session.post(LOCAL_BRIDGE_URL, json=payload, timeout=2)
        except Exception:
            pass

    threading.Thread(target=_send, daemon=True).start()


def post_to_cloud_api(codes: list):
    def _send():
        for code in codes:
            try:
                response = requests.post(API_URL, json={"data": code}, timeout=5)
                if response.status_code != 200:
                    print(f"API error {response.status_code}: {response.text}")
            except Exception as e:
                print(f"Failed to send to API: {e}")

    threading.Thread(target=_send, daemon=True).start()


# ── MAIN ─────────────────────────────────────────────

def run_tcp_client(host, port):
    connect_plc()
    threading.Thread(target=drain_plc_queue_background, daemon=True).start()
    threading.Thread(target=refresh_stack_size_background, daemon=True).start()

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

            # ── NOREAD: stop belt immediately and notify React ──
            has_noread = any(c.lower() == "noread" for c in raw_codes)
            if has_noread:
                print("❌ NOREAD received — stopping belt.", flush=True)
                send_plc(1)  # stop belt immediately via PLC
                notify_react(["noread"], error="noread", missing=0, extra=0)
                continue     # skip normal QR processing for this packet

            codes = [extract_qr_value(c) for c in raw_codes]

            if not codes:
                continue

            stack_size = cached_stack_size
            count      = len(codes)

            print(f"Packet: {count} QR(s), expected: {stack_size}", flush=True)

            if count == stack_size:
                print(f"✅ Stack of {stack_size} complete — belt continues", flush=True)
                for code in codes:
                    print(f"  QR: {code}", flush=True)
                post_to_cloud_api(codes)
                notify_react(codes, complete=True)

            else:
                missing = max(0, stack_size - count)
                extra   = max(0, count - stack_size)
                print(f"❌ MISMATCH: got {count}, expected {stack_size} | missing={missing} extra={extra}", flush=True)
                send_plc(1)
                post_to_cloud_api(codes)
                notify_react(codes, error="mismatch", missing=missing, extra=extra)
                for code in codes:
                    print(f"  QR: {code}", flush=True)

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
    HOST = config.CAMERA_HOST
    PORT = config.CAMERA_PORT
    run_tcp_client(HOST, PORT)