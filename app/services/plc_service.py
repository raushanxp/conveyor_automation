"""
PLC Service — handles conveyor start/stop logic.
Currently MOCKED. Will be replaced with real Modbus TCP later.

When real PLC is connected:
- start_conveyor() will send Modbus write to register 40001
- stop_conveyor() will send Modbus write to register 40001
"""

from app import state


def start_conveyor() -> dict:
    """
    Start the conveyor belt.
    
    Returns dict with status, conveyor state, and light color.
    Fails if PLC is disconnected or conveyor is already running.
    """
    # Check PLC connection
    if not state.plc_connected:
        state.set_error("PLC_DISCONNECTED", "Cannot start — PLC is not connected")
        state.set_lights(red=True)
        return {
            "status": "FAILED",
            "conveyor": "STOPPED",
            "light": "RED",
        }

    # Already running check
    if state.conveyor_running:
        return {
            "status": "SUCCESS",
            "conveyor": "RUNNING",
            "light": "GREEN",
        }

    # --- MOCK: Start conveyor ---
    # REAL: send_signal_to_plc(1) via Modbus TCP
    state.conveyor_running = True
    state.clear_error()
    state.set_lights(green=True)

    return {
        "status": "SUCCESS",
        "conveyor": "RUNNING",
        "light": "GREEN",
    }


def stop_conveyor() -> dict:
    """
    Stop the conveyor belt.
    
    Returns dict with status, conveyor state, and light color.
    """
    # Check PLC connection
    if not state.plc_connected:
        state.set_error("PLC_DISCONNECTED", "PLC is not connected")
        state.set_lights(red=True)
        return {
            "status": "FAILED",
            "conveyor": "STOPPED",
            "light": "RED",
        }

    # Already stopped check
    if not state.conveyor_running:
        return {
            "status": "SUCCESS",
            "conveyor": "STOPPED",
            "light": "YELLOW",
        }

    # --- MOCK: Stop conveyor ---
    # REAL: send_signal_to_plc(0) via Modbus TCP
    state.conveyor_running = False
    state.set_lights(yellow=True)

    return {
        "status": "SUCCESS",
        "conveyor": "STOPPED",
        "light": "YELLOW",
    }
