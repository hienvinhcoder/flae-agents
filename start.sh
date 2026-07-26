#!/bin/bash
# start.sh - Khởi động hệ thống flae-agents
# Backend, DB, Temporal chạy ngầm trong Docker Compose
# Frontend chạy bằng Vite trực tiếp bên ngoài để hỗ trợ hot reload

set -e

# Đường dẫn thư mục gốc của dự án
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================================="
echo "🚀 Đang khởi động hệ thống FLAE Agents..."
echo "=========================================================="

# 1. Khởi động Docker Compose
echo "📦 Khởi động các dịch vụ Backend, DB, Redis và Temporal..."
docker compose up -d

# 2. Kiểm tra và đồng bộ dependencies cho Frontend
echo "📦 Kiểm tra dependencies của Frontend..."
cd "$PROJECT_DIR/frontend"

if [ ! -d "node_modules" ]; then
  echo "⚠️  Không tìm thấy node_modules. Đang cài đặt dependencies từ package-lock.json..."
  npm ci
elif ! npm ls --depth=0 > /dev/null 2>&1; then
  echo "⚠️  Dependencies hiện có đã cũ hoặc chưa đầy đủ. Đang đồng bộ lại từ package-lock.json..."
  npm ci
else
  echo "✅ Dependencies hiện có hợp lệ."
fi

# 3. Khởi chạy Vite Frontend ở chế độ Foreground
echo "=========================================================="
echo "✨ Đang khởi chạy Vite Frontend..."
echo "🌐 Ứng dụng sẽ khả dụng tại: http://localhost:4200"
echo "ℹ️  Nhấn Ctrl+C để dừng Frontend."
echo "ℹ️  Để tắt hoàn toàn các dịch vụ Backend & DB chạy ngầm, hãy chạy: ./stop.sh"
echo "=========================================================="

npm run dev
