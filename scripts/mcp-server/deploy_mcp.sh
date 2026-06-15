#!/bin/bash
set -e

VPS_HOST=${VPS_HOST:-"187.124.98.130"}
VPS_USER=${VPS_USER:-"intrustindia"}
VPS_PORT=22

echo "Deploying MCP Server to VPS..."

# Create remote directory
ssh -o StrictHostKeyChecking=no -p $VPS_PORT $VPS_USER@$VPS_HOST "mkdir -p /var/www/intrustindia.com/mcp-server"

# Sync files
rsync -avz --exclude 'node_modules' package.json index.js -e "ssh -p $VPS_PORT" $VPS_USER@$VPS_HOST:/var/www/intrustindia.com/mcp-server/

# Install dependencies and restart via PM2
ssh -o StrictHostKeyChecking=no -p $VPS_PORT $VPS_USER@$VPS_HOST << 'EOF'
    # Source NVM to ensure node/npm are available
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    cd /var/www/intrustindia.com/mcp-server
    npm install

    # Install pm2 if not installed
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi

    # Read the DB password securely from ops.conf
    source /etc/intrust/ops.conf || true

    # Generate an API key if not set
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
    
    echo "=========================================="
    echo "MCP Server is running on port 8001!"
    echo "API KEY: $MCP_API_KEY"
    echo "=========================================="
EOF

echo "Done."
