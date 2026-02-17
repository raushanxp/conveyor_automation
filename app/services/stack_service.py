"""
Stack Service — handles stack configuration, counting, validation, and leftover logic.
Currently MOCKED for box detection and QR validation.

When real hardware is connected:
- Box detection will come from the TCP scanner (192.168.0.39:2002)
- QR validation will use QRManager from qr_manager.py
"""

from app import state


# Valid stack sizes the operator can configure
VALID_STACK_SIZES = [5, 6, 8, 10]


def configure_stack_size(size: int) -> dict:
    """
    Set the target stack size.
    
    Only allows: 5, 6, 8, 10.
    Resets the current stack counter when size changes.
    """
    if size not in VALID_STACK_SIZES:
        return {
            "status": "FAILED",
            "message": f"Invalid stack size. Allowed: {VALID_STACK_SIZES}",
        }

    state.stack_target_size = size
    state.reset_stack()
    state.update_timestamp()

    return {
        "status": "SUCCESS",
        "stack_size": size,
    }


def add_box(qr_code: str = "MOCK_QR") -> dict:
    """
    Register a new box in the current stack.
    Called when a box is detected on the conveyor.
    
    This is the CORE counting logic:
    - Increments counter
    - Checks if stack is complete (count == target)
    - Checks for mismatch (count > target — should not happen normally)
    
    Returns current stack status after adding the box.
    """
    # Don't accept boxes if conveyor is stopped
    if not state.conveyor_running:
        return {
            "status": "REJECTED",
            "reason": "Conveyor is not running",
        }

    # Increment counts
    state.stack_current_count += 1
    state.total_job_count += 1
    state.update_timestamp()

    current = state.stack_current_count
    target = state.stack_target_size

    # --- STACK COMPLETE ---
    if current == target:
        state.stack_state = "COMPLETE"
        state.set_lights(green=True)
        state.clear_error()

        result = {
            "status": "COMPLETE",
            "current_count": current,
            "target_size": target,
            "message": f"Stack complete! {current}/{target} boxes.",
        }

        # Auto-reset for next stack
        state.reset_stack()
        return result

    # --- MISMATCH (overflow — should not happen in normal operation) ---
    if current > target:
        state.stack_state = "MISMATCH"
        state.conveyor_running = False
        state.set_lights(red=True)
        state.set_error("STACK_MISMATCH", f"Stack overflow: {current}/{target} boxes")

        return {
            "status": "MISMATCH",
            "current_count": current,
            "target_size": target,
            "message": f"MISMATCH! {current} boxes detected, expected {target}. Conveyor STOPPED.",
        }

    # --- STILL COLLECTING ---
    state.stack_state = "COLLECTING"
    return {
        "status": "COLLECTING",
        "current_count": current,
        "target_size": target,
        "message": f"Collecting: {current}/{target} boxes.",
    }


def force_end_stack() -> dict:
    """
    Force-end the current stack (job end scenario).
    
    LEFTOVER LOGIC:
    - If current_count < target_size AND current_count > 0
      → Mark as LEFTOVER, allow boxes to pass, job COMPLETED
    - If current_count == 0
      → Nothing to do
    - If current_count == target_size
      → Already handled by add_box as COMPLETE
    """
    current = state.stack_current_count
    target = state.stack_target_size

    # No boxes in current stack
    if current == 0:
        return {
            "status": "NO_ACTION",
            "message": "No boxes in current stack to process.",
        }

    # Leftover boxes — ALLOW them to pass
    if current < target:
        state.stack_state = "LEFTOVER"
        state.set_lights(yellow=True)
        state.clear_error()
        state.update_timestamp()

        result = {
            "status": "COMPLETED",
            "leftover_count": current,
            "target_size": target,
            "total_job_count": state.total_job_count,
            "message": f"Leftover boxes passed successfully. Total boxes: {state.total_job_count}.",
        }

        # Reset stack counter but keep total count until a new job starts
        state.reset_stack()
        return result

    # Exact match (shouldn't reach here, but handle it)
    if current == target:
        state.stack_state = "COMPLETE"
        state.reset_stack()
        return {
            "status": "COMPLETE",
            "message": f"Stack was already complete: {current}/{target}.",
        }

    # Overflow (shouldn't reach here either)
    return {
        "status": "MISMATCH",
        "message": f"Unexpected state: {current}/{target}.",
    }
