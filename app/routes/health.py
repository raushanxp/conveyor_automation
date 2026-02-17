"""
Health Check Route
GET /api/v1/health
"""

from fastapi import APIRouter
from app import state

router = APIRouter()


@router.get("/api/v1/health")
def health_check():
    """
    Returns API and PLC connection status.
    Quick check for operator to verify system is alive.
    """
    return {
        "api": "UP",
        "plc": "CONNECTED" if state.plc_connected else "DISCONNECTED",
    }
