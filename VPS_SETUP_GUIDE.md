# How to Set Up a Permanent IP for INTRUST (VPS Deployment Guide)

To get a permanent Static IP address for your SprintVerify KYC setup, you need to deploy your Next.js application to a Virtual Private Server (VPS) instead of using Vercel or your local PC.

Here is the exact step-by-step guide to deploying your Next.js app on a **Ubuntu 22.04/24.04 VPS** using **DigitalOcean, Hostinger, AWS EC2, or Hetzner**.

---

## Step 1: Purchase and Connect to Your VPS
1. **Buy a VPS**: Go to DigitalOcean, Hostinger, or Hetzner and create a new **Ubuntu Server**. A basic $5 or $6/month plan (1GB - 2GB RAM) is enough to start.
2. **Find Your IP**: Once the server is created, the dashboard will give you a **Public IPv4 Address** (e.g., `192.45.67.89`).
   * **STOP HERE**: This is your Permanent IP. Copy this IP and paste it into your SprintVerify Dashboard whitelist immediately! It will forever be authorized.
3. **Connect via SSH**: Open your Windows command prompt/PowerShell and connect to your server:
   ```bash
   ssh root@192.45.67.89
   ```

---

## Step 2: Install Required Software (Node.js, Git, Nginx, PM2)
Run these commands one by one to install the software your Next.js app needs to run continuously:

```bash
# Update Ubuntu package lists
sudo apt update && sudo apt upgrade -y

# Install Git and Nginx (Web Server)
sudo apt install git nginx -y

# Install Node.js (Version 20 or 22)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (Keeps your Next.js app running 24/7 if it crashes)
sudo npm install -g pm2
```

---

## Step 3: Clone Your Code to the Server
Clone your GitHub repository containing the INTRUST codebase inside the server:

```bash
# Navigate to the web folder
cd /var/www

# Clone your project (replace with your actual git URL)
git clone https://github.com/2003a/intrust-india-main.git

# Enter the folder
cd intrust-india-main
```

---

## Step 4: Configure Environment Variables
You need all your Supabase, Sabpaisa, and SprintVerify keys on the server.

```bash
# Create the .env.local file
nano .env.local
```
*Paste ALL of the environment variables exactly as they are in your local machine into this file. Press `Ctrl+O`, `Enter`, then `Ctrl+X` to save and exit.*

---

## Step 5: Install Dependencies & Build
Install the packages and build the optimized production version of your Next.js app:

```bash
# Install packages
npm install

# Build the app (this might take 2-4 minutes)
npm run build
```

---

## Step 6: Start the App with PM2
Instead of `npm run start` which stops if you close the terminal, you will use PM2.

```bash
# Start the Next.js app on port 3000 using PM2
pm2 start npm --name "intrust-app" -- start

# Tell PM2 to automatically restart the app if the server reboots
pm2 startup
pm2 save
```

Your app is now running on the server at `http://localhost:3000` but the outside world can't see it yet.

---

## Step 7: Configure Nginx as a Reverse Proxy
Nginx will take web traffic coming to your IP (or domain name like `intrust.in`) on port 80 and forward it to your Next.js app on port 3000.

```bash
# Open the Nginx default config file
sudo nano /etc/nginx/sites-available/default
```

Delete everything inside the file, and paste this exactly:

```nginx
server {
    listen 80;
    server_name 192.45.67.89; # Replace with your Domain Name or VPS IP

    location / {
        proxy_pass http://localhost:3000; # Forwards to Next.js
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Security Headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
*Save with `Ctrl+O`, `Enter`, `Ctrl+X`.*

Restart Nginx to apply the changes:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### ✅ Done!
You can now visit your VPS IP address (e.g., `http://192.45.67.89`) in any web browser, and you will see the live INTRUST marketplace.

Whenever SprintVerify makes an API call, it will originate from this server, bypassing all "Invalid User" errors forever!
