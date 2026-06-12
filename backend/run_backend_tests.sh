#!/bin/bash
set -e

# Di chuyển vào thư mục backend nếu đang ở thư mục ngoài
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo "🚀 Khởi chạy Backend Test Suite cho FLAE Agents..."
echo "=========================================================="

# 1. Kiểm tra xem Docker Postgres & Redis có đang chạy không
echo "Checking Docker services (Postgres, Redis)..."
if ! docker compose -f ../docker-compose.yml ps | grep -q "postgres.*Up"; then
  echo "⚠️ Cảnh báo: Container Postgres không chạy. Đang khởi chạy các services..."
  docker compose -f ../docker-compose.yml up -d postgres redis
  echo "Chờ database postgres sẵn sàng..."
  sleep 5
fi

# 2. Set environment variables
export ENVIRONMENT="testing"

# 3. Chạy Pytest
echo "=========================================================="
echo "🏃 Đang chạy tests với pytest..."
echo "=========================================================="
uv run pytest --cov=app tests/ "$@"

echo "=========================================================="
echo "✅ Backend tests hoàn tất thành công!"
echo "=========================================================="
