#!/bin/bash
set -e

# Di chuyển vào thư mục frontend
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR/frontend"

echo "=========================================================="
echo "🚀 Kiểm tra kiểu dữ liệu, lint và độ bao phủ kiểm thử Frontend..."
echo "=========================================================="

npm run typecheck
npm run lint
npm run test:coverage

echo "=========================================================="
echo "✅ Frontend tests hoàn tất thành công!"
echo "=========================================================="
