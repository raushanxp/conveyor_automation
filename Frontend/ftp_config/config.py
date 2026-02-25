import os

# FTP Settings
FTP_HOST = "192.168.0.77"
FTP_PORT = 2005
FTP_USER = "User"
FTP_PASS = "123456"

# Storage Settings
# The user specified this path for image storage
DATA_DIR = r"C:\Users\akash\OneDrive\Desktop\simpel\Lux_Wms\lux_wms\ftp_config\hik-camera-data"
# Ensure data directory exists
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR, exist_ok=True)

# API Settings
API_HOST = "0.0.0.0"
API_PORT = 8000

# Logging
LOG_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "ingestion.log"))
