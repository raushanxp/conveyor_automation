import argparse
import ftplib
import sys

def connect_ftp(host, port, user, password):
    try:
        print(f"Attempting to connect to {host}:{port} as {user}...")
        ftp = ftplib.FTP()
        ftp.connect(host, port, timeout=10) # Added timeout
        ftp.login(user, password)
        print(f"Successfully connected to {host}")
        return ftp
    except ftplib.all_errors as e:
        print(f"Error connecting to FTP: {e}")
        return None

def list_files(ftp):
    try:
        print("\n--- File List ---")
        ftp.retrlines('LIST')
        print("-----------------")
        
        filenames = ftp.nlst()
        return filenames
    except ftplib.all_errors as e:
        print(f"Error listing files: {e}")
        return []

def download_file(ftp, filename):
    try:
        print(f"Downloading {filename}...")
        with open(filename, 'wb') as f:
            ftp.retrbinary('RETR ' + filename, f.write)
        print(f"Downloaded: {filename}")
    except ftplib.all_errors as e:
        print(f"Error downloading {filename}: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='FTP Manager for IDMS Data')
    parser.add_argument('host', help='FTP Host IP', default='192.168.0.39', nargs='?')
    parser.add_argument('--port', type=int, default=21, help='FTP Port')
    parser.add_argument('--user', default='anonymous', help='FTP Username')
    parser.add_argument('--pass', dest='password', default='anonymous@', help='FTP Password')
    
    args = parser.parse_args()

    ftp = connect_ftp(args.host, args.port, args.user, args.password)
    if ftp:
        files = list_files(ftp)
        ftp.quit()
    else:
        sys.exit(1)
