import socket
import requests
import sys

API_URL = "https://leader.salaryslip.co/api/webbook/write"
LOCAL_BRIDGE_URL = "http://127.0.0.1:5000/api/qr" 

def post_to_cloud_api(payload: str):
    """Sends data to the cloud API endpoint individually"""
    try:
        response = requests.post(API_URL, json={"data": payload}, timeout=5)
        if response.status_code != 200:
            print(f"\nAPI error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"\nFailed to send to API: {e}")

def run_tcp_client(host, port):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_address = (host, port)

        print(f"Connecting to {host} port {port}...")
        sock.connect(server_address)
        print("Connected.")
        
        sent_codes = set()

        while True:
            data = sock.recv(4096)
            if not data:
                print("\nServer closed connection.")
                break

            try:
                decoded_buffer = data.decode("utf-8")
            except UnicodeDecodeError:
                decoded_buffer = data.decode("utf-8", errors="ignore")

            codes = [c.strip() for c in decoded_buffer.replace('\n', ';').split(';') if c.strip()]
            
            # NEW: Collect all new codes in a list to send to React at once
            batch_for_react = []

            for decoded in codes:
                if decoded not in sent_codes:
                    print(decoded, flush=True)
                    post_to_cloud_api(decoded) # Send to cloud API
                    sent_codes.add(decoded)
                    batch_for_react.append(decoded) # Add to React batch
                else:
                    print(f"[DUP] {decoded}", flush=True)
                    
            # NEW: Send the whole batch to the local React UI in one single request
            if batch_for_react:
                try:
                    requests.post(LOCAL_BRIDGE_URL, json={"qr_codes": batch_for_react}, timeout=2)
                except Exception:
                    pass # Silently fail if React bridge is off

    except KeyboardInterrupt:
        print("\nClient stopped by user.")
    except Exception as e:
        print(f"\nAn error occurred: {e}")
    finally:
        print("\nClosing socket.")
        sock.close()

if __name__ == "__main__":
    HOST = "192.168.0.78"
    PORT = 2002
    run_tcp_client(HOST, PORT)
