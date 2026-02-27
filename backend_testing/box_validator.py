"""
Box Validator Service
=====================
Connects to the QR scanner TCP stream, counts unique QR codes per stack,
and stops the conveyor via PLC (Modbus TCP) if the count doesn't match
the expected stack size.

Usage:
    python3 box_validator.py --expected 6
    python3 box_validator.py --expected 8 --timeout 5

Logic:
    detected_count == expected  → No signal, conveyor keeps running
    detected_count != expected  → Send 1 to PLC register 40001, conveyor stops
"""

import socket
import struct
import time

# --- Configuration ---
QR_SCANNER_HOST = "192.168.0.78"
QR_SCANNER_PORT = 2002

PLC_HOST = "192.168.0.40"
PLC_PORT = 502

# ✏️ CHANGE THIS VALUE for your stack size (6, 8, or any number)
EXPECTED_BOX_COUNT = 6

# Quiet period (seconds) — if no QR arrives for this long, batch is considered done
QUIET_TIMEOUT = 0.0


# =====================================================================
# PLC Communication (Modbus TCP)
# Pattern from: test_plc_connection.py
# =====================================================================

def create_modbus_packet(value: int, unit_id=1):
    """
    Creates a Modbus TCP packet for Write Single Register (Function 06).
    Target Address: 40001 (0x0000 in protocol).
    """
    transaction_id = 0
    protocol_id = 0
    length = 6
    function_code = 6   # Write Single Register
    register_addr = 0   # 0x0000 = register 40001

    packet = struct.pack('>HHHBBHH',
                         transaction_id, protocol_id, length,
                         unit_id, function_code, register_addr, value)
    return packet


def send_plc_signal(value: int):
    """
    Sends 0 or 1 to PLC register 40001 via Modbus TCP.
    Opens a fresh socket each time (same pattern as conveyor_tracker.py).
    """
    try:
        packet = create_modbus_packet(value)

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(2.0)
            s.connect((PLC_HOST, PLC_PORT))
            s.sendall(packet)
            # Read response to confirm write
            s.recv(1024)
            print(f"📡 PLC Signal Sent: {value} → Register 40001")

    except Exception as e:
        print(f"❌ PLC Signal Failed: {e}")


# =====================================================================
# Validation Logic
# =====================================================================

def validate_stack(expected_count: int, unique_codes: set):
    """
    Compares detected QR count against expected.
    - Match     → conveyor keeps running (no signal)
    - Mismatch  → send 1 to PLC (stop conveyor)

    Returns True if stack is valid, False otherwise.
    """
    detected_count = len(unique_codes)

    print(f"\n{'='*50}")
    print(f"🔍 STACK VALIDATION")
    print(f"   Expected:  {expected_count}")
    print(f"   Detected:  {detected_count}")
    print(f"   QR Codes:  {list(unique_codes)}")

    if detected_count == expected_count:
        print(f"   ✅ STACK OK — Conveyor keeps running")
        print(f"{'='*50}\n")
        return True
    else:
        if detected_count < expected_count:
            diff = expected_count - detected_count
            print(f"   🛑 MISMATCH — {diff} box(es) MISSING")
        else:
            diff = detected_count - expected_count
            print(f"   🛑 MISMATCH — {diff} EXTRA box(es)")

        print(f"   → Sending STOP signal (1) to PLC...")
        send_plc_signal(1)
        print(f"{'='*50}\n")
        return False


# =====================================================================
# TCP QR Stream Reader + Batch Detection
# =====================================================================

def run_validator(expected_count: int, quiet_timeout: float):
    """
    Main loop:
    1. Connect to QR scanner TCP stream
    2. Collect unique QR codes into a batch
    3. When no data arrives for 'quiet_timeout' seconds → batch is done
    4. Validate batch count vs expected
    5. Reset and wait for next batch
    """
    print(f"\n{'='*50}")
    print(f"📦 BOX VALIDATOR SERVICE")
    print(f"   Scanner:   {QR_SCANNER_HOST}:{QR_SCANNER_PORT}")
    print(f"   PLC:       {PLC_HOST}:{PLC_PORT}")
    print(f"   Expected:  {expected_count} boxes per stack")
    print(f"   Timeout:   {quiet_timeout}s (quiet period = batch done)")
    print(f"{'='*50}\n")

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        print(f"Connecting to QR scanner at {QR_SCANNER_HOST}:{QR_SCANNER_PORT}...")
        sock.connect((QR_SCANNER_HOST, QR_SCANNER_PORT))
        print("✅ Connected. Waiting for boxes...\n")

        batch_codes = set()       # Unique QR codes in current batch
        last_data_time = None     # Timestamp of last received data
        batch_active = False      # Whether we're currently collecting a batch

        while True:
            # Use a short timeout to detect quiet periods
            sock.settimeout(0.5)

            try:
                data = sock.recv(4096)

                if not data:
                    print("\n⚠️ Scanner connection lost.")
                    break

                try:
                    decoded_buffer = data.decode("utf-8").strip()
                except UnicodeDecodeError:
                    decoded_buffer = data.decode("utf-8", errors="ignore").strip()

                if not decoded_buffer:
                    continue

                # Split by semicolons and newlines (scanner sends multiple QRs per packet)
                codes = [c.strip() for c in decoded_buffer.replace('\n', ';').split(';') if c.strip()]

                for code in codes:
                    # Skip "NoRead" signals
                    if code.lower() == "noread":
                        continue

                    if code not in batch_codes:
                        batch_codes.add(code)
                        print(f"  📥 [{len(batch_codes)}] New QR: {code}")
                    else:
                        print(f"  [DUP] {code}")

                last_data_time = time.time()
                batch_active = True

            except socket.timeout:
                # No data received — check if quiet period has elapsed
                if batch_active and last_data_time is not None:
                    elapsed = time.time() - last_data_time

                    if elapsed >= quiet_timeout:
                        # Batch is done — validate
                        validate_stack(expected_count, batch_codes)

                        # Reset for next batch
                        batch_codes.clear()
                        batch_active = False
                        last_data_time = None
                        print("⏳ Waiting for next stack...\n")

    except KeyboardInterrupt:
        print("\n\n🛑 Validator stopped by user.")
        if batch_codes:
            print(f"   Unvalidated codes in buffer: {len(batch_codes)}")
    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        sock.close()
        print("Connection closed.")


# =====================================================================
# Entry Point
# =====================================================================

if __name__ == "__main__":
    run_validator(EXPECTED_BOX_COUNT, QUIET_TIMEOUT)
