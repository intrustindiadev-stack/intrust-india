import paramiko
import io

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
sftp = c.open_sftp()

script = """
import urllib.request
import json
import os

req = urllib.request.Request('http://localhost:3000/api/crm/leads?page=1')
req.add_header('Cookie', 'sb-acovrtovpsxezdoyixk-auth-token-code-verifier=...; ') # Need valid cookie
# Actually, it's easier to just call the function internally or query the DB using the same logic.
"""
