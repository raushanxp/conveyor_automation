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
        # Filter out current and parent directory markers and strip whitespace
        filenames = [f.strip() for f in filenames if f.strip() not in ('.', '..')]
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

def get_file_content(ftp, filename):
    """
    Retrieves the content of a file from the FTP server and returns it as a string.
    """
    try:
        print(f"Fetching content of {filename}...")
        lines = []
        ftp.retrlines('RETR ' + filename, lines.append)
        return "\n".join(lines)
    except ftplib.all_errors as e:
        print(f"Error fetching content of {filename}: {e}")
        return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='FTP Manager for IDMS Data')
    parser.add_argument('host', help='FTP Host IP', default='192.168.0.77', nargs='?')
    parser.add_argument('--port', type=int, default=8080, help='FTP Port')
    parser.add_argument('--user', default='User', help='FTP Username')
    parser.add_argument('--pass', dest='password', default='123456', help='FTP Password')
    parser.add_argument('--path', default='.', help='Initial FTP path')
    
    args = parser.parse_args()

    ftp = connect_ftp(args.host, args.port, args.user, args.password)
    if ftp:
        if args.path != '.':
            try:
                ftp.cwd(args.path)
                print(f"Changed directory to {args.path}")
            except ftplib.all_errors as e:
                print(f"Error changing directory to {args.path}: {e}")

        files = list_files(ftp)
        
        # Example: Fetch content of the first file if available
        if files:
            # We try to determine if it's a file by trying to fetch its size
            # or just by catching the 550 error specifically.
            for item in files:
                try:
                    # SIZE command often fails on directories
                    ftp.size(item)
                    # If size succeeds, it's likely a file
                    content = get_file_content(ftp, item)
                    if content:
                        print(f"\n--- Content of {item} ---")
                        print(content)
                        print("------------------------------")
                        break # Just show one for the example
                except ftplib.all_errors:
                    print(f"Skipping {item} (might be a directory or protected)")
            
            if not any(files): # This check is a bit redundant but good for logic
                print("\nNo readable files found in this directory.")
                print("Tip: Use --path <folder_name> to explore subdirectories.")
        else:
            print("\nThis directory is empty.")
            print("Tip: Use --path <folder_name> to explore subdirectories.")
