#!/bin/bash
set -e

# Di chuyển vào thư mục frontend
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR/frontend"

echo "=========================================================="
echo "🚀 Khởi chạy Frontend Test Suite (Angular) ở chế độ Headless..."
echo "=========================================================="

npm run test -- --watch=false --browsers=ChromeHeadless

echo "=========================================================="
echo "✅ Frontend tests hoàn tất thành công!"
echo "=========================================================="
