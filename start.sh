#!/bin/bash
# start.sh - Khởi động hệ thống flae-agents
# Backend, DB, Temporal chạy ngầm trong Docker Compose
# Frontend chạy bằng ng serve trực tiếp bên ngoài để hỗ trợ hot reload

set -e

# Đường dẫn thư mục gốc của dự án
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================================="
echo "🚀 Đang khởi động hệ thống FLAE Agents..."
echo "=========================================================="

# 1. Khởi động Docker Compose
echo "📦 Khởi động các dịch vụ Backend, DB, Redis và Temporal..."
docker compose up

# 2. Kiểm tra và cài đặt dependencies cho Frontend
echo "📦 Kiểm tra thư mục Frontend..."
cd "$PROJECT_DIR/frontend"

if [ ! -d "node_modules" ]; then
  echo "⚠️  Không tìm thấy node_modules trong thư mục frontend. Đang cài đặt dependencies..."
  npm install
else
  echo "✅ Thư mục node_modules đã tồn tại."
fi

# 3. Khởi chạy Angular Frontend ở chế độ Foreground
echo "=========================================================="
echo "✨ Đang khởi chạy Angular Frontend (ng serve)..."
echo "🌐 Ứng dụng sẽ khả dụng tại: http://localhost:4200"
echo "ℹ️  Nhấn Ctrl+C để dừng Frontend."
echo "ℹ️  Để tắt hoàn toàn các dịch vụ Backend & DB chạy ngầm, hãy chạy: ./stop.sh"
echo "=========================================================="

npm run start
