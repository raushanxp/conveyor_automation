import socket
import requests
import sys

API_URL = "https://leader.salaryslip.co/api/webbook/write"

def post_to_api(payload: str):
    """
    Sends data to the API endpoint
    """
    try:
        response = requests.post(
            API_URL,
            json={
                "data": payload
            },
            timeout=5
        )
        if response.status_code != 200:
            print(f"\nAPI error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"\nFailed to send to API: {e}")


def run_tcp_client(host, port):
    """
    Connects to a TCP server, receives data,
    prints it, and posts it to an API.
    """
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
                decoded = data.decode("utf-8")
            except UnicodeDecodeError:
                decoded = data.decode("utf-8", errors="ignore")

            # Send to API and print locally only if not a duplicate
            if decoded not in sent_codes:
                # Print locally
                print(decoded, end="", flush=True)
                
                post_to_api(decoded)
                sent_codes.add(decoded)
            else:
                pass

    except KeyboardInterrupt:
        print("\nClient stopped by user.")
    except Exception as e:
        print(f"\nAn error occurred: {e}")
    finally:
        print("\nClosing socket.")
        sock.close()


if __name__ == "__main__":
    HOST = "192.168.0.39"
    PORT = 2002
    run_tcp_client(HOST, PORT)
