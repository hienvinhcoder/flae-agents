#!/bin/bash
# stop.sh - Dừng toàn bộ hệ thống flae-agents
# Tắt cả frontend bên ngoài lẫn các dịch vụ trong Docker Compose

# Đường dẫn thư mục gốc của dự án
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================================="
echo "🛑 Đang dừng hệ thống FLAE Agents..."
echo "=========================================================="

# 1. Tắt các container trong Docker Compose
echo "📦 Đang tắt các dịch vụ Docker Compose..."
docker compose down --remove-orphans

# 2. Tìm và tắt tiến trình Frontend đang chạy trên port 4200 (nếu có)
echo "🌐 Đang tìm kiếm và tắt các tiến trình Frontend..."
PORT_PID=$(lsof -t -i:4200 2>/dev/null || true)
if [ ! -z "$PORT_PID" ]; then
  echo "🔥 Đang dừng tiến trình Frontend đang chạy trên port 4200 (PID: $PORT_PID)..."
  kill $PORT_PID 2>/dev/null || true
  sleep 1
fi

echo "=========================================================="
echo "✅ Đã tắt toàn bộ hệ thống thành công!"
echo "=========================================================="
