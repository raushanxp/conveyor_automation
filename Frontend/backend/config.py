import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# FTP Settings
FTP_HOST = os.getenv("FTP_HOST", "192.168.0.77")
FTP_PORT = int(os.getenv("FTP_PORT", "2005"))
FTP_USER = os.getenv("FTP_USER", "User")
FTP_PASS = os.getenv("FTP_PASS", "123456")

# Storage Settings
_env_data_dir = os.getenv("DATA_DIR", "hik-camera-data")
if os.path.isabs(_env_data_dir):
    DATA_DIR = _env_data_dir
else:
    # relative to this file's directory
    DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), _env_data_dir))

# Ensure data directory exists
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR, exist_ok=True)

# API Settings
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# Backend Server Settings
BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "5000"))

# PLC Settings
PLC_IP = os.getenv("PLC_IP", "192.168.0.40")
PLC_PORT = int(os.getenv("PLC_PORT", "502"))

# Camera Settings
CAMERA_HOST = os.getenv("CAMERA_HOST", "192.168.0.78")
CAMERA_PORT = int(os.getenv("CAMERA_PORT", "2002"))

# Logging
LOG_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "ingestion.log"))
