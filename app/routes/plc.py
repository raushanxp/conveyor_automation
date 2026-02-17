"""
PLC Control Routes
POST /api/v1/plc/start
POST /api/v1/plc/stop
"""

from fastapi import APIRouter
from app.services import plc_service

router = APIRouter()


@router.post("/api/v1/plc/start")
def start_conveyor():
    """Start the conveyor belt via PLC."""
    return plc_service.start_conveyor()


@router.post("/api/v1/plc/stop")
def stop_conveyor():
    """Stop the conveyor belt via PLC."""
    return plc_service.stop_conveyor()
