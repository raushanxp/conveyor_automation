from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pathlib import Path
import os
import time
import asyncio
import json
import config

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
except ImportError:
    raise ImportError("Please run: pip install watchdog")

app = FastAPI(title="Hikrobot Camera Ingestion API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

data_path = Path(config.DATA_DIR).resolve()
if not data_path.exists():
    data_path.mkdir(parents=True, exist_ok=True)

app.mount("/images", StaticFiles(directory=str(data_path)), name="images")

latest_image_state = None
subscribers = set()
observer = None

def get_image_metadata(file_path: Path):
    if not file_path.exists():
        return None
    stats = file_path.stat()
    upload_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(stats.st_mtime))
    try:
        relative_path = file_path.relative_to(data_path)
    except ValueError:
        relative_path = file_path.name
    
    relative_path_web = str(relative_path).replace("\\", "/")
    return {
        "filename": file_path.name,
        "upload_timestamp": upload_timestamp,
        "public_url": f"/images/{relative_path_web}",
        "full_path": str(file_path),
        "size_bytes": stats.st_size
    }

class NewImageHandler(FileSystemEventHandler):
    def __init__(self, loop):
        self.loop = loop

    def on_created(self, event):
        if not event.is_directory:
            ext = os.path.splitext(event.src_path)[1].lower()
            if ext in ('.jpg', '.jpeg', '.png', '.bmp', '.tiff'):
                file_path = Path(event.src_path)
                
                # Wait until the FTP server completely finishes writing the image.
                # We check if the file size is > 0 and stops actively growing.
                last_size = -1
                stable_count = 0
                for _ in range(50):  # Max 5 seconds wait
                    try:
                        if file_path.exists():
                            current_size = file_path.stat().st_size
                            if current_size > 0:
                                if current_size == last_size:
                                    stable_count += 1
                                    if stable_count >= 2:  # Size hasn't changed for 200ms
                                        break
                                else:
                                    stable_count = 0
                            last_size = current_size
                    except Exception:
                        pass
                    time.sleep(0.1)
                
                global latest_image_state
                new_state = get_image_metadata(file_path)
                if new_state:
                    latest_image_state = new_state
                    for q in list(subscribers):
                        self.loop.call_soon_threadsafe(q.put_nowait, new_state)

@app.on_event("startup")
async def startup_event():
    global latest_image_state, observer
    print(f"INFO: Initializing repository and searching for initial image at {data_path}")
    
    valid_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff')
    image_files = []
    for ext in valid_extensions:
        image_files.extend(list(data_path.rglob(f"*{ext}")))
        image_files.extend(list(data_path.rglob(f"*{ext.upper()}")))

    if image_files:
        latest_file = max(image_files, key=lambda p: p.stat().st_mtime)
        latest_image_state = get_image_metadata(latest_file)
        print(f"INFO: Found initial image: {latest_file.name}")
    else:
        print("INFO: No initial images found.")

    loop = asyncio.get_running_loop()
    event_handler = NewImageHandler(loop)
    observer = Observer()
    observer.schedule(event_handler, str(data_path), recursive=True)
    observer.start()
    print("INFO: Watchdog observer started.")

@app.on_event("shutdown")
async def shutdown_event():
    global observer
    if observer:
        observer.stop()
        observer.join()
        print("INFO: Watchdog observer stopped.")

@app.get("/latest-image")
async def get_latest_image():
    if not latest_image_state:
        raise HTTPException(status_code=404, detail="No images found yet. Waiting for first scan...")
    return latest_image_state

@app.get("/stream-latest-image")
async def stream_latest_image(request: Request):
    async def event_generator():
        q = asyncio.Queue()
        subscribers.add(q)
        
        try:
            if latest_image_state:
                yield f"data: {json.dumps(latest_image_state)}\n\n"
            
            while True:
                msg = await q.get()
                yield f"data: {json.dumps(msg)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            subscribers.remove(q)
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

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