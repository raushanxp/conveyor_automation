# Industrial Camera Image Ingestion System

This system provides an FTP server for Hikrobot cameras to upload images and a FastAPI backend to serve them to a dashboard.

## Project Structure
- `config.py`: Configuration settings (FTP credentials, paths).
- `ftp_server.py`: FTP server implementation with logging.
- `api_server.py`: FastAPI backend to serve images and metadata.
- `main.py`: Orchestrator to run both servers simultaneously.
- `requirements.txt`: Python dependencies.

## Installation Steps

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Verify Configuration**:
   Open `config.py` and ensure `FTP_HOST` matches your Ubuntu machine's IP (configured as `192.168.0.77`).

## Run Instructions

Run the orchestrator to start both the FTP and API servers:
```bash
python main.py
```

- **FTP Server**: Listening on `192.168.0.77:2005`
- **FastAPI Dashboard API**: Listening on `0.0.0.0:8000`

## API Endpoints

- **Get Latest Image**: `GET http://localhost:8000/latest-image`
- **Access Static Images**: `http://localhost:8000/images/<filename>.jpg`

## Security Hardening Recommendations

1. **Firewall**: Ensure port `2005` (FTP) and `8000` (API) are only open to the trusted local network.
2. **Dedicated User**: Run the Python process under a dedicated non-root user with permissions limited to the `hik-cam-data` directory.
3. **Passive Mode Ports**: If you encounter issues through firewalls, you might need to restrict `pyftpdlib` passive ports and open them in the firewall.
4. **SSL/TLS**: For production use outside a secure LAN, consider wrapping the API in Nginx with SSL and using FTPS.
