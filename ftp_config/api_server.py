from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
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

# Mount the data directory to serve images statically
# URL path will be /images/filename.jpg
if not os.path.exists(config.DATA_DIR):
    os.makedirs(config.DATA_DIR, exist_ok=True)

app.mount("/images", StaticFiles(directory=config.DATA_DIR), name="images")

@app.get("/latest-image")
async def get_latest_image():
    """Returns metadata for the most recently uploaded image."""
    files = glob.glob(os.path.join(config.DATA_DIR, "*"))
    
    # Filter for common image extensions (case-insensitive)
    valid_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff')
    image_files = [f for f in files if f.lower().endswith(valid_extensions)]

    if not image_files:
        raise HTTPException(status_code=404, detail="No images found")

    # Sort files by modification time (most recent first)
    latest_file_path = max(image_files, key=os.path.getmtime)
    filename = os.path.basename(latest_file_path)
    
    # Get stats
    stats = os.stat(latest_file_path)
    upload_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(stats.st_mtime))
    
    # Construct public URL (assumes the API is accessible on the LAN)
    # Using a relative path or a placeholder for the host
    public_url = f"/images/{filename}"

    return {
        "filename": filename,
        "upload_timestamp": upload_timestamp,
        "public_url": public_url,
        "full_path": latest_file_path,
        "size_bytes": stats.st_size
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "storage": config.DATA_DIR}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.API_HOST, port=config.API_PORT)
