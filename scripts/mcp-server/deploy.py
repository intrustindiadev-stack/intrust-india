import paramiko
import os
import sys

HOST = os.environ.get("VPS_HOST", "187.124.98.130")
USER = os.environ.get("VPS_USER", "intrustindia")
PASS = os.environ.get("VPS_PASSWORD", "Intrustdev@2026")

def deploy():
    print("Connecting to VPS...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS)

    print("Creating remote directory...")
    client.exec_command("mkdir -p /var/www/intrustindia.com/mcp-server")

    print("Uploading files...")
    sftp = client.open_sftp()
    
    files = ["package.json", "index.js"]
    for f in files:
        local_path = os.path.join(os.path.dirname(__file__), f)
        remote_path = f"/var/www/intrustindia.com/mcp-server/{f}"
        sftp.put(local_path, remote_path)
    sftp.close()

    print("Installing dependencies and starting PM2...")
    cmd = """
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    cd /var/www/intrustindia.com/mcp-server
    npm install
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
    source /etc/intrust/ops.conf || true
    if [ -z "$MCP_API_KEY" ]; then
        if [ ! -f .env ]; then
            NEW_KEY=$(openssl rand -hex 16)
            echo "MCP_API_KEY=$NEW_KEY" > .env
        fi
        source .env
    fi
    export DB_PASSWORD="$POSTGRES_PASSWORD"
    export PORT=8001
    pm2 start index.js --name "mcp-server" --update-env || pm2 restart mcp-server --update-env
    pm2 save
    echo "API_KEY=$MCP_API_KEY"
    """
    stdin, stdout, stderr = client.exec_command(cmd)
    
    out = stdout.read().decode()
    err = stderr.read().decode()
    
    for line in out.splitlines():
        if "API_KEY=" in line:
            print("\n==========================================")
            print("MCP Server deployed successfully!")
            print(f"Your Secret Key: {line.split('=')[1]}")
            print("==========================================\n")
            
    if err:
        print("Warning/Error:", err)
    
    client.close()

if __name__ == "__main__":
    deploy()
