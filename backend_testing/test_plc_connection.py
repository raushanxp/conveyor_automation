import socket
import sys
import subprocess
import platform

def ping_ip(host):
    """Returns True if host responds to a ping request."""
    param = '-n' if platform.system().lower() == 'windows' else '-c'
    command = ['ping', param, '1', host]
    print(f"Pinging {host}...")
    try:
        return subprocess.call(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0
    except Exception:
        return False

import struct

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

def write_to_plc(sock, message):
    """Sends a message to the PLC. Auto-converts '0'/'1' to Modbus."""
    try:
        # Check for direct '0' or '1' commands (Modbus Shortcut)
        if message in ['0', '1']:
            val = int(message)
            packet = create_modbus_packet(val)
            sock.sendall(packet)
            print(f"✅ SENT (MODBUS): Write {val} to Reg 40001")
            print(f"   Raw: {packet.hex()}")
            return True

        if message.startswith('h:'):
            # Convert hex string to bytes
            hex_data = message[2:]
            data_to_send = bytes.fromhex(hex_data)
            sock.sendall(data_to_send)
            print(f"✅ SENT (HEX): {hex_data}")
        else:
            sock.sendall(message.encode('utf-8'))
            print(f"✅ SENT (TEXT): {message}")
        return True
    except Exception as e:
        print(f"❌ Write Failed: {e}")
        return False

def create_modbus_read_packet(start_addr=0, count=1, unit_id=1):
    """
    Creates a Modbus TCP packet for Read Holding Registers (Function 03).
    """
    transaction_id = 0
    protocol_id = 0
    length = 6
    function_code = 3   # Read Holding Registers
    
    packet = struct.pack('>HHHBBHH', 
                         transaction_id, protocol_id, length, 
                         unit_id, function_code, start_addr, count)
    return packet

def read_from_plc(sock, buffer_size=4096):
    """Reads data from the PLC."""
    try:
        sock.settimeout(2.0)
        data = sock.recv(buffer_size)
        
        if not data:
            print("⚠️ Socket closed by remote host.")
            return None
        
        # Parse Modbus Response
        # Header (7 bytes) + Count (1 byte) + Data (N bytes)
        if len(data) >= 9:
            # Extract the data value (last 2 bytes for a single register)
            val = int.from_bytes(data[-2:], byteorder='big')
            print(f"✅ RECEIVED (MODBUS): Reg Value = {val}")
        
        print(f"   Raw: {data.hex(' ')}")
        return data
        
    except socket.timeout:
        print("⚠️ Read Timeout: No data arrived from PLC.")
        return None
    except Exception as e:
        print(f"❌ Read Failed: {e}")
        return None

def interactive_terminal(sock):
    """Runs an interactive loop for reading and writing."""
    print("\n--- PLC Interactive Terminal ---")
    print("Commands: 'w' (Write), 'r' (Read), 'q' (Quit)")
    print("Tip: 'r' will now ask to read Reg 40001 (Address 0)")
    
    while True:
        choice = input("\nEnter command [w/r/q]: ").lower().strip()
        
        if choice == 'w':
            msg = input("Enter text (or h:HEX): ")
            write_to_plc(sock, msg)
        elif choice == 'r':
            print("Sending Read Request for Reg 40001...")
            req = create_modbus_read_packet()
            sock.sendall(req)
            read_from_plc(sock)
        elif choice == 'q':
            print("Exiting interactive terminal.")
            break
        else:
            print("Invalid choice. Use w, r, or q.")

def test_plc_connection(host, port, timeout=5):
    """Establishes connection and starts interactive mode."""
    if not ping_ip(host):
        print(f"❌ ERROR: {host} is NOT reachable via Ping.")
        return

    print(f"✅ SUCCESS: {host} is reachable (Ping OK)")
    print(f"Attempting TCP connection to {host}:{port}...")

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            s.connect((host, port))
            print(f"✅ SUCCESS: Connected to {host}:{port}")
            
            # Start the interactive part
            interactive_terminal(s)
            
    except ConnectionRefusedError:
        print(f"❌ ERROR: Port {port} REFUSED the connection.")
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    # Current config based on your previous changes
    PLC_IP = "192.168.0.40"
    PLC_PORT = 502
    
    test_plc_connection(PLC_IP, PLC_PORT)