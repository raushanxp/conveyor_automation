import socket
import requests
from qr_manager import QRManager

import struct

# --- Configuration ---
HOST = "192.168.0.39"
PORT = 2002

# PLC Configuration
PLC_HOST = "192.168.0.40"
PLC_PORT = 502
API_URL = "https://leader.salaryslip.co/api/webbook/write"

def create_modbus_packet(value: int, unit_id=1):
    """
    Creates a Modbus TCP packet for Write Single Register (Function 06).
    Target Address: 40001 (0x0000 in protocol).
    """
    transaction_id = 0  # Can be random
    protocol_id = 0     # 0 = Modbus TCP
    length = 6          # Bytes to follow (Unit + Func + Addr + Val)
    function_code = 6   # Write Single Register
    register_addr = 0   # 0x0000 corresponds to 40001
    
    # Pack data: >HHHBBHH (Big Endian)
    packet = struct.pack('>HHHBBHH', 
                         transaction_id, protocol_id, length, 
                         unit_id, function_code, register_addr, value)
    return packet

def send_signal_to_plc(bit_value: int):
    """Sends '0' or '1' to the PLC via Modbus TCP (Reg 40001)."""
    try:
        packet = create_modbus_packet(bit_value)
        
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(2.0)
            s.connect((PLC_HOST, PLC_PORT))
            s.sendall(packet)
            
            # Optional: Read response to clear buffer and confirm write
            response = s.recv(1024)
            print(f"PLC Signal Sent (Modbus): {bit_value}")
            # print(f"PLC Response: {response.hex()}") 
            
    except Exception as e:
        print(f"PLC Signal Failed: {e}")

def post_to_api(payload: str):
    """Sends data to the API endpoint."""
    try:
        response = requests.post(API_URL, json={"data": payload}, timeout=5)
        if response.status_code != 200:
            print(f"API error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Failed to send to API: {e}")

def run_dynamic_tracker():
    """
    Connects to the conveyor TCP server and tracks unique boxes dynamically.
    """
    manager = QRManager()
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        print(f"Connecting to Conveyor at {HOST}:{PORT}...")
        sock.connect((HOST, PORT))
        print("Connected. Waiting for boxes...")
        
        while True:
            data = sock.recv(4096)
            if not data:
                print("\nConveyor connection lost.")
                break

            try:
                decoded_buffer = data.decode("utf-8").strip()
            except UnicodeDecodeError:
                decoded_buffer = data.decode("utf-8", errors="ignore").strip()

            if not decoded_buffer:
                continue

            # Split by newline in case multiple codes were sent in one packet
            codes = [c.strip() for c in decoded_buffer.split('\n') if c.strip()]

            for decoded in codes:
                # --- Dynamic Tracking Logic ---
                is_new_box = manager.process_code(decoded)
                
                if is_new_box:
                    total = manager.get_total_count()
                    bit_status = manager.is_target_reached(target=6)
                    
                    # print(f"\n[NEW BOX DETECTED]")
                    # print(f"QR Content: {decoded}")
                    # print(f"Current Batch Count: {total}")
                    # print(f"PLC Status Bit: {bit_status}")
                    
                    # Signal the PLC at port 40001
                    send_signal_to_plc(bit_status)
                    
                    # Send to API
                    post_to_api(decoded)

                    # --- NEW: Check for Batch Completion & Reset ---
                    if bit_status == 0:  # 0 means Target Reached (Inverted Logic)
                        print(f"✅ BATCH COMPLETE! (Count: {total})")
                        print("🔄 Resetting Counter for Next Batch...")
                        
                        manager.reset()
                        
                        # Send '1' to indicate new batch started
                        send_signal_to_plc(1)
                        print("🚀 New Batch Started (Signal: 1)")
                else:
                    # This box has already been counted in this session
                    pass

    except KeyboardInterrupt:
        print("\nStopping tracker...")
    except Exception as e:
        print(f"\nError: {e}")
    finally:
        sock.close()
        print(f"Final Batch Count: {manager.get_total_count()}")
        print("Connection closed.")

if __name__ == "__main__":
    run_dynamic_tracker()
