#!/usr/bin/env python3
"""Send a command to the running paper-downloader script.

Usage:
    python send-command.py continue
    python send-command.py abort
    python send-command.py skip
    python send-command.py status
"""

import json
import sys
import time

COMMAND_FILE = "/tmp/paper-downloader-command.json"
STATUS_FILE = "/tmp/paper-downloader-status.json"

def send_command(cmd: str):
    with open(COMMAND_FILE, 'w') as f:
        json.dump({"command": cmd, "timestamp": time.time()}, f)
    print(f"Command sent: {cmd}")

def show_status():
    try:
        with open(STATUS_FILE, 'r') as f:
            data = json.load(f)
        age = time.time() - data.get("timestamp", 0)
        print(f"State:    {data.get('state', '?')}")
        print(f"Message:  {data.get('message', '?')}")
        print(f"URL:      {data.get('url', '?')}")
        print(f"Age:      {age:.0f}s ago")
    except FileNotFoundError:
        print("No active status (script not running?)")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python send-command.py [continue|abort|skip|status]")
        sys.exit(1)

    cmd = sys.argv[1].lower()
    if cmd == "status":
        show_status()
    elif cmd in ("continue", "abort", "skip"):
        send_command(cmd)
    else:
        print(f"Unknown command: {cmd}")
        print("Valid: continue, abort, skip, status")
        sys.exit(1)
