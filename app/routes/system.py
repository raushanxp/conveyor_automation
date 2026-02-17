"""
System Status Route
GET /api/v1/system/status
"""

from fastapi import APIRouter
from app import state

router = APIRouter()


@router.get("/api/v1/system/status")
def get_system_status():
    """
    Returns the FULL system status snapshot.
    This is the MOST IMPORTANT endpoint — operator polls this for live data.
    
    Includes: PLC connection, conveyor state, stack data,
    signal lights, errors, and timestamp.
    """
    return state.get_status_snapshot()
