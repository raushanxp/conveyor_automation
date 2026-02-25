import multiprocessing
import time
import logging
from ftp_server import run_ftp_server
import uvicorn
from api_server import app
import config

def start_api():
    logging.info(f"Starting API server on {config.API_HOST}:{config.API_PORT}")
    uvicorn.run(app, host=config.API_HOST, port=config.API_PORT)

if __name__ == "__main__":
    # Setup logging for the main process
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    # Create processes
    ftp_process = multiprocessing.Process(target=run_ftp_server, name="FTP-Server")
    api_process = multiprocessing.Process(target=start_api, name="API-Server")

    try:
        logging.info("Starting Industrial Camera Ingestion System...")
        
        ftp_process.start()
        api_process.start()

        # Keep the main process alive until interrupted
        while True:
            time.sleep(1)
            if not ftp_process.is_alive():
                logging.error("FTP Server process died. Restarting...")
                ftp_process = multiprocessing.Process(target=run_ftp_server, name="FTP-Server")
                ftp_process.start()
            
            if not api_process.is_alive():
                logging.error("API Server process died. Restarting...")
                api_process = multiprocessing.Process(target=start_api, name="API-Server")
                api_process.start()

    except KeyboardInterrupt:
        logging.info("Shutting down system...")
        ftp_process.terminate()
        api_process.terminate()
        ftp_process.join()
        api_process.join()
        logging.info("System stopped.")
