# Conveyor Automation System

Industrial conveyor stacking & tracking system with a React frontend and Python backend services.

## Prerequisites

- **Node.js** (v18+) & **npm**
- **Python 3** (v3.8+) & **pip**

## Setup

### 1. Install Frontend Dependencies

```bash
npm install
```

### 2. Install Backend (Python) Dependencies

```bash
pip install -r backend/requirements.txt
```

## Running

Start all services (backend + frontend) with a single command:

```bash
python3 start_all.py
```

This launches:

| Service               | Port |
| --------------------- | ---- |
| Flask PLC Bridge      | 5000 |
| QR Scanner TCP Client | —    |
| FTP Camera Server     | 2005 |
| Camera Image API      | 8000 |
| React Dev Server      | 5173 |

Open [http://localhost:5173](http://localhost:5173) in your browser.

Press **Ctrl + C** to stop all services.
