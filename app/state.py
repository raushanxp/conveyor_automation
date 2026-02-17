"""
In-memory state for the conveyor stacking system.
This is the SINGLE SOURCE OF TRUTH for all system state.

All state is stored in a single SystemState instance.
No database — everything lives in memory.
"""

from datetime import datetime, timezone


# --------------- STATE VARIABLES ---------------

# PLC State
plc_connected: bool = True       # Mocked as connected
conveyor_running: bool = False   # Conveyor starts stopped

# Light State
light_red: bool = False
light_yellow: bool = True        # Yellow on startup (waiting)
light_green: bool = False

# Stack State
stack_target_size: int = 6       # Default target
stack_current_count: int = 0
total_job_count: int = 0         # Cumulative count for the whole job (y)
stack_state: str = "COLLECTING"  # COLLECTING | COMPLETE | MISMATCH | LEFTOVER

# Error State
error_code: str | None = None    # STACK_MISMATCH | QR_ERROR | SENSOR_FAULT | PLC_DISCONNECTED | EMERGENCY_STOP
error_message: str | None = None

# Timestamp
updated_at: str = datetime.now(timezone.utc).isoformat()


# --------------- HELPER FUNCTIONS ---------------

def update_timestamp():
    """Update the global timestamp to current UTC time."""
    global updated_at
    updated_at = datetime.now(timezone.utc).isoformat()


def set_lights(red: bool = False, yellow: bool = False, green: bool = False):
    """Set all three signal lights at once. Prevents conflicting states."""
    global light_red, light_yellow, light_green
    light_red = red
    light_yellow = yellow
    light_green = green
    update_timestamp()


def set_error(code: str | None, message: str | None = None):
    """Set or clear the current error state."""
    global error_code, error_message
    error_code = code
    error_message = message
    update_timestamp()


def clear_error():
    """Clear any active error."""
    set_error(None, None)


def reset_stack():
    """Reset stack counter to zero. Does NOT reset total_job_count."""
    global stack_current_count, stack_state
    stack_current_count = 0
    stack_state = "COLLECTING"
    update_timestamp()


def reset_full_job():
    """Reset everything for a brand new job."""
    global total_job_count
    total_job_count = 0
    reset_stack()


def get_status_snapshot() -> dict:
    """
    Returns the full system status as a dictionary.
    This is what GET /api/v1/system/status returns.
    """
    return {
        "plc_connection": "CONNECTED" if plc_connected else "DISCONNECTED",
        "conveyor": "RUNNING" if conveyor_running else "STOPPED",
        "stack": {
            "target_size": stack_target_size,
            "current_count": stack_current_count,
            "total_job_count": total_job_count,
            "state": stack_state,
        },
        "lights": {
            "red": light_red,
            "yellow": light_yellow,
            "green": light_green,
        },
        "error": error_code,
        "message": error_message,
        "updated_at": updated_at,
    }
