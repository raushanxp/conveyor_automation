"""
Shared in-process queue for PLC commands.
Both server.py and tcp_client.py import this module.
Because they run in the same Python process, they share
the exact same queue object — no HTTP, no polling, no delay.
"""
import queue

# Flask puts 0 (start) or 1 (stop) here.
# tcp_client drains it immediately in its command loop.
plc_command_queue = queue.Queue()