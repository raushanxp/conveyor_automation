"""
Stack Configuration & Control Routes
POST /api/v1/stack/config      — Set target stack size
POST /api/v1/stack/add-box     — Simulate a box detection (mock)
POST /api/v1/stack/end         — Force-end stack (leftover handling)
"""

from fastapi import APIRouter
from pydantic import BaseModel
from app.services import stack_service

router = APIRouter()


class StackConfigRequest(BaseModel):
    """Request body for stack size configuration."""
    stack_size: int


@router.post("/api/v1/stack/config")
def set_stack_size(request: StackConfigRequest):
    """
    Set target stack size (5, 6, 8, or 10).
    Resets current stack counter on change.
    """
    return stack_service.configure_stack_size(request.stack_size)


@router.post("/api/v1/stack/add-box")
def add_box():
    """
    MOCK ENDPOINT — Simulates a box being detected on the conveyor.
    In production, this will be triggered by the TCP scanner automatically.
    """
    return stack_service.add_box()


@router.post("/api/v1/stack/end")
def end_stack():
    """
    Force-end the current stack (job end).
    Handles leftover boxes — allows them to pass and marks job as COMPLETED.
    """
    return stack_service.force_end_stack()
