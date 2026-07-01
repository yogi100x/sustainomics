# Deploying The Sustainomics to Azure VM

## Architecture

- **Azure VM** (Ubuntu 22.04+, 1 vCPU, 1GB+ RAM)
- **Node.js 22** running the Astro/EmDash server via **pm2**
- **nginx** as reverse proxy on port 80
- **SQLite** database at `~/sustainomics/data.db` (persists on VM disk)
- **Uploads** at `~/sustainomics/uploads/` (persists on VM disk)
- **GitHub Actions** auto-deploys on every push to `main`

## First-Time VM Setup

### 1. SSH into your VM
```bash
ssh azureuser@YOUR_VM_IP
```

### 2. Run the setup script
```bash
bash <(curl -s https://raw.githubusercontent.com/yogi100x/sustainomics/main/scripts/vm-setup.sh)
```

### 3. Edit the .env file
```bash
nano ~/sustainomics/.env
```
Set `EMDASH_SITE_URL` to your VM's public IP or domain (e.g. `http://20.1.2.3`).

### 4. Seed the database
```bash
cd ~/sustainomics
node_modules/.bin/emdash seed seed/seed.json --on-conflict=update
```

### 5. Complete admin setup
Visit `http://YOUR_VM_IP/_emdash/admin/setup` and create your admin account.

That's it — the site is live and the database persists forever on the VM disk.

---

## GitHub Actions Auto-Deploy

Every push to `main` automatically deploys to the VM. To enable this:

### Add GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `VM_HOST` | Your VM's public IP address |
| `VM_USER` | `azureuser` |
| `VM_SSH_KEY` | Your VM's **private** SSH key (contents of `~/.ssh/id_rsa`) |

### Generate an SSH key pair (if needed)
On your Mac:
```bash
ssh-keygen -t ed25519 -C "sustainomics-deploy" -f ~/.ssh/sustainomics_deploy
```
Then add the **public key** to the VM:
```bash
ssh-copy-id -i ~/.ssh/sustainomics_deploy.pub azureuser@YOUR_VM_IP
```
And add the **private key** (`~/.ssh/sustainomics_deploy`) as the `VM_SSH_KEY` GitHub secret.

---

## Environment Variables

Set in `~/sustainomics/.env` on the VM:

| Variable | Value |
|----------|-------|
| `EMDASH_ENCRYPTION_KEY` | `emdash_enc_v1_gvh10torGYqe-DM63FfpDwDXsOXCV8SRMmBrWzw_w3A` |
| `EMDASH_SITE_URL` | `http://YOUR_VM_IP` (or `https://yourdomain.com`) |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `HOST` | `127.0.0.1` |

---

## Day-to-Day Operations

```bash
# Check app status
pm2 status

# View logs
pm2 logs sustainomics

# Restart app
pm2 restart sustainomics

# Re-seed content (safe, won't duplicate)
cd ~/sustainomics && node_modules/.bin/emdash seed seed/seed.json --on-conflict=update
```

## Adding a Custom Domain + HTTPS

1. Point your domain's A record to the VM IP
2. SSH into VM and run:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```
3. Update `EMDASH_SITE_URL` in `.env` to `https://yourdomain.com`
4. Restart: `pm2 restart sustainomics`
