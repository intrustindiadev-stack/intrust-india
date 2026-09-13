"""
run_vps_cmd.py — run an arbitrary shell command on the VPS via SSH.

Usage (pipe command via stdin):
    echo "pm2 list" | python scripts/run_vps_cmd.py

Usage (-c flag):
    python scripts/run_vps_cmd.py -c "docker ps"
    python scripts/run_vps_cmd.py -c "source ~/.nvm/nvm.sh && pm2 restart intrust-india"
"""

import sys
import argparse
from vps_config import exec_vps_cmd

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("-c", "--command", help="Shell command to run on VPS")
    args = parser.parse_args()

    if args.command:
        cmd = args.command
    elif not sys.stdin.isatty():
        cmd = sys.stdin.read().strip()
    else:
        print("ERROR: provide command via -c or stdin.")
        sys.exit(1)

    out, err = exec_vps_cmd(cmd)
    if out.strip():
        print(out.strip())
    if err.strip():
        print("ERR:", err.strip(), file=sys.stderr)

if __name__ == "__main__":
    main()
