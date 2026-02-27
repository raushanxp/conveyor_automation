from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import glob
import time
import config

app = FastAPI(title="Hikrobot Camera Ingestion API")

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure the data directory exists using pathlib for better Windows support
data_path = Path(config.DATA_DIR).resolve()
if not data_path.exists():
    data_path.mkdir(parents=True, exist_ok=True)

# Mount the data directory to serve images statically
# This allows access via http://localhost:8000/images/...
app.mount("/images", StaticFiles(directory=str(data_path)), name="images")

@app.get("/latest-image")
async def get_latest_image():
    """Returns metadata for the most recently uploaded image, searching recursively."""
    
    # Define valid image extensions
    valid_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff')
    
    # Search recursively for all files
    # Using Path.rglob is often more reliable on Windows than glob.glob
    image_files = []
    for ext in valid_extensions:
        image_files.extend(list(data_path.rglob(f"*{ext}")))
        image_files.extend(list(data_path.rglob(f"*{ext.upper()}")))

    if not image_files:
        # Debugging print to your terminal
        print(f"DEBUG: No images found in {data_path}")
        raise HTTPException(status_code=404, detail="No images found in any subfolder")

    # Sort files by modification time (most recent first)
    # Using stat().st_mtime for accuracy
    latest_file = max(image_files, key=lambda p: p.stat().st_mtime)
    
    # Get the relative path for the URL (e.g., "192.168.0.78/image/ok/filename.jpg")
    try:
        relative_path = latest_file.relative_to(data_path)
    except ValueError:
        # Fallback if path logic gets tangled
        relative_path = latest_file.name
    
    # Convert to web-friendly forward slashes
    relative_path_web = str(relative_path).replace("\\", "/")
    
    # Get file statistics
    stats = latest_file.stat()
    upload_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(stats.st_mtime))
    
    # Construct public URL
    public_url = f"/images/{relative_path_web}"

    # Terminal log to help you track what the API is finding
    print(f"INFO: Serving latest image: {relative_path_web}")

    return {
        "filename": latest_file.name,
        "upload_timestamp": upload_timestamp,
        "public_url": public_url,
        "full_path": str(latest_file),
        "size_bytes": stats.st_size
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "storage_path": str(data_path),
        "exists": data_path.exists()
    }

if __name__ == "__main__":
    import uvicorn
    print(f"Starting API Server. Monitoring folder: {data_path}")
    uvicorn.run(app, host=config.API_HOST, port=config.API_PORT)