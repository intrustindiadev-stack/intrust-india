"""Find the actual Next.js app and its source on VPS."""
import paramiko

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)

_, stdout, _ = c.exec_command("ls -la /home/intrustindia/intrust-india/")
print("/home/intrustindia/intrust-india/:")
print(stdout.read().decode())

_, stdout, _ = c.exec_command("cat /home/intrustindia/intrust-india/.pm2_options 2>/dev/null || echo 'No pm2 options'")
print("PM2 options:", stdout.read().decode())

_, stdout, _ = c.exec_command("cat /home/intrustindia/.pm2/dump.pm2 2>/dev/null | python3 -c 'import sys,json; data=json.load(sys.stdin); [print(p[\"name\"],p.get(\"pm_cwd\",\"?\"), p.get(\"pm_exec_path\",\"?\")) for p in data]' 2>/dev/null || echo 'No dump'")
print("PM2 dump:", stdout.read().decode())

_, stdout, _ = c.exec_command("cat /home/intrustindia/.pm2/dump.pm2 2>/dev/null | head -50")
print("PM2 raw dump:", stdout.read().decode()[:1000])

c.close()
