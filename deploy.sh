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
source venv/bin/activate
pip install -r requirements.txt --quiet
python manage.py collectstatic --noinput
python manage.py migrate

echo "⚙️ [3/5] Restarting Gunicorn API service..."
systemctl restart royalagencies

echo "⚛️ [4/5] Building React Frontend..."
cd /var/www/royalagencies/frontend
echo "VITE_API_BASE_URL=/api/v1" > .env.production
npm install --quiet
npm run build

echo "🌐 [5/5] Reloading Nginx..."
systemctl reload nginx

echo "==========================================="
echo "✅ Deployment Complete! Live at https://royalagencies.online"
echo "==========================================="
