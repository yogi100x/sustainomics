#!/bin/bash
# One-time setup for Azure VM. Run as azureuser.
set -e

echo "=== 1. System update ==="
sudo apt-get update && sudo apt-get upgrade -y

echo "=== 2. Install Node.js 22 ==="
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== 3. Install pnpm ==="
sudo npm install -g pnpm

echo "=== 4. Install pm2 ==="
sudo npm install -g pm2

echo "=== 5. Install nginx ==="
sudo apt-get install -y nginx

echo "=== 6. Clone repo ==="
cd ~
git clone https://github.com/yogi100x/sustainomics.git sustainomics
cd sustainomics

echo "=== 7. Create .env ==="
cat > .env << 'EOF'
EMDASH_ENCRYPTION_KEY=emdash_enc_v1_gvh10torGYqe-DM63FfpDwDXsOXCV8SRMmBrWzw_w3A
EMDASH_SITE_URL=http://YOUR_VM_IP
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
EOF
echo ">>> Edit .env now and set EMDASH_SITE_URL to your VM IP or domain"

echo "=== 8. Install deps and build ==="
pnpm install --frozen-lockfile
pnpm build

echo "=== 9. Configure nginx ==="
sudo cp nginx.conf /etc/nginx/sites-available/sustainomics
sudo ln -sf /etc/nginx/sites-available/sustainomics /etc/nginx/sites-enabled/sustainomics
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "=== 10. Start app with pm2 ==="
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup | tail -1 | sudo bash

echo ""
echo "==================================="
echo "Setup complete! Now run:"
echo "  node_modules/.bin/emdash seed seed/seed.json --on-conflict=update"
echo "Then visit http://YOUR_VM_IP/_emdash/admin/setup"
echo "==================================="
