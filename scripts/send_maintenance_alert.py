"""
InTrust India - Maintenance Alert & Broadcast CLI
=================================================
Dispatches Email & WhatsApp notifications for Maintenance Break:
1. Alert management (status, duration, bypass link).
2. Broadcast to visitors who subscribed on the maintenance page when back online.

Usage:
  # Notify Admin that maintenance is active:
  python scripts/send_maintenance_alert.py --action alert --status activated

  # Notify Admin that maintenance is resolved:
  python scripts/send_maintenance_alert.py --action alert --status deactivated

  # Broadcast "We're Back Online!" to all subscribed visitors:
  python scripts/send_maintenance_alert.py --action broadcast-resolved
"""

import os
import sys
import argparse
import requests

BASE_URL = os.environ.get("NEXT_PUBLIC_APP_URL", "https://www.intrustindia.com")
BYPASS_KEY = os.environ.get("MAINTENANCE_BYPASS_KEY", "intrust_admin_bypass_2026")
INTERNAL_TOKEN = os.environ.get("INTERNAL_API_TOKEN")

def main():
    parser = argparse.ArgumentParser(description="Maintenance Notification Dispatcher")
    parser.add_argument(
        "--action", 
        choices=["alert", "broadcast-resolved"], 
        default="alert", 
        help="Action to perform: 'alert' (notify admins) or 'broadcast-resolved' (notify subscribers)"
    )
    parser.add_argument(
        "--status", 
        choices=["activated", "deactivated"], 
        default="activated", 
        help="Status for admin alert"
    )
    parser.add_argument("--note", help="Optional memo to append to alert")
    parser.add_argument("--url", default=BASE_URL, help="Base application URL")
    args = parser.parse_args()

    endpoint = f"{args.url.rstrip('/')}/api/maintenance/broadcast"
    headers = {
        "Content-Type": "application/json",
        "x-admin-key": BYPASS_KEY,
    }
    if INTERNAL_TOKEN:
        headers["Authorization"] = f"Bearer {INTERNAL_TOKEN}"

    payload = {}
    if args.action == "alert":
        payload = {
            "action": "admin-alert",
            "status": args.status,
            "note": args.note,
        }
    elif args.action == "broadcast-resolved":
        payload = {
            "action": "broadcast-resolved",
        }

    print(f"\n=======================================================")
    print(f"  InTrust India - Maintenance Notification Dispatch")
    print(f"=======================================================")
    print(f"Target Endpoint: {endpoint}")
    print(f"Action:          {payload.get('action')}")
    if "status" in payload:
        print(f"Status:          {payload.get('status')}")
    print(f"Dispatching...\n")

    try:
        res = requests.post(endpoint, json=payload, headers=headers, timeout=30)
        print(f"Response Status: {res.status_code}")
        data = res.json()
        print(f"Result: {data}")

        if res.status_code == 200 and data.get("success"):
            print("\n[OK] Notifications dispatched successfully!\n")
        else:
            print(f"\n[ERROR] Request failed: {data.get('error')}\n")
            sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Failed to send request: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
