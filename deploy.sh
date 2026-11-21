#!/bin/bash
set -e

echo "==========================================="
echo "🚀 Starting Royal Agencies Deployment..."
echo "==========================================="

# Navigate to project root
cd /var/www/royalagencies

echo "🔄 [1/5] Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main

echo "🐍 [2/5] Updating Backend (Python packages, migrations & static)..."
pg_ctlcluster 18 main start 2>/dev/null || true
systemctl start postgresql 2>/dev/null || true
systemctl enable postgresql 2>/dev/null || true
systemctl enable postgresql@18-main 2>/dev/null || true
source venv/bin/activate
pip install -r requirements.txt --quiet
python manage.py collectstatic --noinput
python manage.py migrate

# Ensure media upload directory exists with proper write permissions
mkdir -p /var/www/royalagencies/media/payment_groups
chmod -R 775 /var/www/royalagencies/media 2>/dev/null || true
chown -R www-data:www-data /var/www/royalagencies/media 2>/dev/null || true

echo "⚙️ [3/5] Restarting Gunicorn API service..."
systemctl restart royalagencies

echo "⚛️ [4/5] Building React Frontend..."
cd /var/www/royalagencies/frontend
echo "VITE_API_BASE_URL=/api/v1" > .env.production
npm install --quiet
export NODE_OPTIONS="--max-old-space-size=1024"
npx vite build

echo "🌐 [5/5] Reloading Nginx..."
systemctl reload nginx

echo "==========================================="
echo "✅ Deployment Complete! Live at https://royalagencies.online"
echo "==========================================="
