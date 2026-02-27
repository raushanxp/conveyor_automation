import logging
import os
from pyftpdlib.authorizers import DummyAuthorizer
from pyftpdlib.handlers import FTPHandler
from pyftpdlib.servers import FTPServer
import config

# Configure logging
logging.basicConfig(
    filename=config.LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
console = logging.StreamHandler()
console.setLevel(logging.INFO)
logging.getLogger('').addHandler(console)

class CameraFTPHandler(FTPHandler):
    def on_file_received(self, file_path):
        """Called when a file has been fully uploaded."""
        logging.info(f"Successfully received file: {file_path}")
        # Here we could trigger post-processing if needed
        # For now, just logging is enough as per requirements

    def on_login(self, username):
        logging.info(f"User {username} logged in.")

    def on_logout(self, username):
        logging.info(f"User {username} logged out.")

    def on_incomplete_file_received(self, file_path):
        """Called when a file upload was interrupted."""
        logging.warning(f"Incomplete file received: {file_path}. Cleaning up.")
        if os.path.exists(file_path):
            os.remove(file_path)

def run_ftp_server():
    # Ensure data directory exists
    if not os.path.exists(config.DATA_DIR):
        os.makedirs(config.DATA_DIR, exist_ok=True)
        logging.info(f"Created data directory: {config.DATA_DIR}")

    authorizer = DummyAuthorizer()
    # Add user with full permissions inside the DATA_DIR (elradfmwMT)
    authorizer.add_user(
        config.FTP_USER, 
        config.FTP_PASS, 
        config.DATA_DIR, 
        perm="elradfmwMT"
    )

    handler = CameraFTPHandler
    handler.authorizer = authorizer
    handler.banner = "Hikrobot Camera Ingestion Server Ready."

    address = (config.FTP_HOST, config.FTP_PORT)
    server = FTPServer(address, handler)

    # Set concurrency limits
    server.max_cons = 256
    server.max_cons_per_ip = 5

    logging.info(f"Starting FTP server on {config.FTP_HOST}:{config.FTP_PORT}")
    server.serve_forever()

if __name__ == "__main__":
    run_ftp_server()
