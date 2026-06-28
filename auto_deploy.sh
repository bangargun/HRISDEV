#!/bin/bash
# ================================================================
# AUTO DEPLOY HRIS BAROKAH
# Jalankan script ini setelah selesai editing kode
# Usage: bash auto_deploy.sh "pesan commit kamu"
# ================================================================

set -e

COMMIT_MSG="${1:-auto: update hris $(date '+%Y-%m-%d %H:%M')}"
VPS_IP="srv1763168.hstgr.cloud"
VPS_PASS="Barokahgrub30@@"
WEB_DIR="/Volumes/Macintosh HD - Data/Users/macair/hris-sistem/hris-web"
ROOT_DIR="/Volumes/Macintosh HD - Data/Users/macair/hris-sistem"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     🚀 HRIS BAROKAH - AUTO DEPLOY PIPELINE          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ─── STEP 1: BUILD WEB PRODUCTION ───────────────────────────
echo "📦 [1/4] Build web production..."
cd "$WEB_DIR"
npm run build
echo "✅ Build sukses!"

# ─── STEP 2: GIT ADD + COMMIT + PUSH ────────────────────────
echo ""
echo "📤 [2/4] Push ke GitHub..."
cd "$ROOT_DIR"
git add -A

# Cek apakah ada perubahan untuk di-commit
if git diff --staged --quiet; then
    echo "ℹ️  Tidak ada perubahan baru untuk di-commit"
else
    git commit -m "$COMMIT_MSG"
    echo "✅ Commit: $COMMIT_MSG"
fi

git push origin main
echo "✅ Push ke GitHub berhasil!"

# ─── STEP 3: UPLOAD DIST KE VPS ─────────────────────────────
echo ""
echo "🌐 [3/4] Upload dist ke VPS..."

# Cek apakah sshpass tersedia
if command -v sshpass &> /dev/null; then
    # Upload dist folder ke VPS via sshpass
    sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -r \
        "$WEB_DIR/dist/." \
        "root@$VPS_IP:/var/www/hris-web/" 2>/dev/null || \
    sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -r \
        "$WEB_DIR/dist/." \
        "ubuntu@$VPS_IP:/var/www/hris-web/" 2>/dev/null
    echo "✅ Upload dist berhasil!"
else
    echo "⚠️  sshpass tidak tersedia, deploy via VPS git pull..."
fi

# ─── STEP 4: RESTART VPS ─────────────────────────────────────
echo ""
echo "🔄 [4/4] Restart service di VPS..."

DEPLOY_CMD='
    # Cari direktori project
    PROJECT_DIR=""
    for DIR in /var/www/hris-barokah-group /var/www/HRISDEV /root/HRISDEV /home/HRISDEV /srv/HRISDEV; do
        if [ -d "$DIR/.git" ]; then
            PROJECT_DIR="$DIR"
            break
        fi
    done
    
    if [ -n "$PROJECT_DIR" ]; then
        echo "📂 Project ditemukan di: $PROJECT_DIR"
        cd "$PROJECT_DIR"
        git fetch origin main
        git reset --hard origin/main
        
        # Copy dist ke webroot nginx
        if [ -d "hris-web/dist" ]; then
            cp -rf hris-web/dist/. /var/www/hris-web/ 2>/dev/null || true
            echo "✅ Dist ter-sync!"
        fi
        
        # Restart nginx
        nginx -t && nginx -s reload 2>/dev/null && echo "✅ Nginx reloaded" || true
        
        # Restart PM2 backend
        pm2 restart hris-backend --update-env 2>/dev/null || \
        pm2 restart all 2>/dev/null || \
        echo "⚠️ PM2 tidak perlu restart"
        
        pm2 save 2>/dev/null || true
        echo "✅ VPS deploy selesai!"
    else
        # Jika tidak ada git repo, hanya reload nginx
        nginx -t && nginx -s reload 2>/dev/null && echo "✅ Nginx reloaded" || echo "ℹ️ Nginx reload skipped"
        pm2 restart all 2>/dev/null || echo "ℹ️ PM2 restart skipped"
        echo "✅ Services restarted!"
    fi
'

# Jalankan deploy command di VPS
if command -v sshpass &> /dev/null; then
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no \
        "root@$VPS_IP" "$DEPLOY_CMD" 2>/dev/null || \
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no \
        "ubuntu@$VPS_IP" "$DEPLOY_CMD" 2>/dev/null || \
    echo "⚠️  SSH deploy gagal - dist sudah diupload via sshpass SCP"
else
    echo "⚠️  sshpass tidak ada. Install dengan: brew install hudochenkov/sshpass/sshpass"
    echo "📝 Deploy manual: SSH ke VPS lalu jalankan 'git pull && nginx -s reload && pm2 restart all'"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ DEPLOY PIPELINE SELESAI!                        ║"
echo "║  🌐 https://hris.barokahgrupindonesia.tech          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
