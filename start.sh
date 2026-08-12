#!/bin/bash
# start.sh - Khởi động hệ thống flae-agents
# Backend, Firebase Emulator và hạ tầng chạy trong Docker Compose; log dịch vụ được theo dõi trực tiếp
# Frontend chạy bằng Vite trực tiếp bên ngoài để hỗ trợ hot reload

set -e

# Đường dẫn thư mục gốc của dự án
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================================="
echo "🚀 Đang khởi động hệ thống FLAE Agents..."
echo "=========================================================="

# 1. Khởi động Docker Compose
echo "📦 Khởi động Backend, Firebase Emulator, DB, Redis và Temporal..."
docker compose up -d

# 2. Khởi tạo cấu hình local cho Frontend nếu chưa có
FRONTEND_DIR="$PROJECT_DIR/frontend"
FRONTEND_ENV_FILE="$FRONTEND_DIR/.env"

if [ ! -f "$FRONTEND_ENV_FILE" ]; then
  cp "$FRONTEND_DIR/.env.example" "$FRONTEND_ENV_FILE"
  echo "⚠️  Đã tạo frontend/.env từ .env.example."
  echo "✅ Firebase Authentication và Storage Emulator đã được bật cho local."
else
  echo "✅ Đã tìm thấy cấu hình frontend/.env."
fi

# 3. Theo dõi log Firebase Emulator, Backend và Workers trong terminal hiện tại
LOGS_PID=""

cleanup_log_follower() {
  if [ -n "$LOGS_PID" ] && kill -0 "$LOGS_PID" 2>/dev/null; then
    kill "$LOGS_PID" 2>/dev/null || true
    wait "$LOGS_PID" 2>/dev/null || true
  fi
}
trap cleanup_log_follower EXIT

echo "📋 Bắt đầu theo dõi log Firebase Emulator, Backend và Workers..."
docker compose logs --follow --tail=100 firebase-emulator backend application-worker knowledge-worker &
LOGS_PID=$!

# 4. Kiểm tra và đồng bộ dependencies cho Frontend
echo "📦 Kiểm tra dependencies của Frontend..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  echo "⚠️  Không tìm thấy node_modules. Đang cài đặt dependencies từ package-lock.json..."
  npm ci
elif ! npm ls --depth=0 > /dev/null 2>&1; then
  echo "⚠️  Dependencies hiện có đã cũ hoặc chưa đầy đủ. Đang đồng bộ lại từ package-lock.json..."
  npm ci
else
  echo "✅ Dependencies hiện có hợp lệ."
fi

# 5. Khởi chạy Vite Frontend ở chế độ Foreground
echo "=========================================================="
echo "✨ Đang khởi chạy Vite Frontend..."
echo "🌐 Ứng dụng sẽ khả dụng tại: http://localhost:4200"
echo "🔥 Firebase Emulator UI: http://localhost:4000"
echo "🔐 Authentication Emulator: http://localhost:9099"
echo "🗄️  Storage Emulator: http://localhost:9199"
echo "📋 Log Firebase Emulator, Backend và Worker sẽ hiển thị trong terminal này."
echo "ℹ️  Nhấn Ctrl+C để dừng Frontend."
echo "ℹ️  Để tắt hoàn toàn các dịch vụ Docker chạy ngầm, hãy chạy: ./stop.sh"
echo "=========================================================="

npm run dev
