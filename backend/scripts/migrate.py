import os
import sys
import importlib.util
from datetime import datetime, timezone
from google.cloud import firestore

from app.db.database import setup_database

MIGRATIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "migrations")
MIGRATIONS_COLLECTION = "migrations"

def get_db_client():
    """Khởi tạo Firestore Client."""
    setup_database()
    return firestore.Client()

def get_applied_migrations(db: firestore.Client) -> set:
    """Lấy danh sách các migration đã chạy thành công từ Firestore."""
    applied = set()
    try:
        docs = db.collection(MIGRATIONS_COLLECTION).stream()
        for doc in docs:
            applied.add(doc.id)
    except Exception as e:
        print(f"Lỗi khi lấy lịch sử migration: {e}")
    return applied

def record_migration(db: firestore.Client, filename: str):
    """Lưu lại tên file script đã chạy thành công."""
    doc_ref = db.collection(MIGRATIONS_COLLECTION).document(filename)
    doc_ref.set({
        "applied_at": datetime.now(timezone.utc),
        "filename": filename
    })

def run_migrations():
    """Chạy các file migration trong thư mục `migrations/`."""
    print("=== BẮT ĐẦU CHẠY FIRESTORE MIGRATION ===")
    db = get_db_client()
    applied_migrations = get_applied_migrations(db)
    
    if not os.path.exists(MIGRATIONS_DIR):
        print(f"Thư mục '{MIGRATIONS_DIR}' không tồn tại. Đã bỏ qua.")
        return

    files = sorted([
        f for f in os.listdir(MIGRATIONS_DIR)
        if f.endswith(".py") and f != "__init__.py"
    ])
    
    pending_files = [f for f in files if f not in applied_migrations]
    
    if not pending_files:
        print("Không có script migration mới nào cần chạy.")
        print("=== HOÀN TẤT ===")
        return
    
    print(f"Tìm thấy {len(pending_files)} script cần chạy...")
    
    for filename in pending_files:
        print(f"\nĐang chạy: {filename}...")
        filepath = os.path.join(MIGRATIONS_DIR, filename)
        
        spec = importlib.util.spec_from_file_location(filename[:-3], filepath)
        module = importlib.util.module_from_spec(spec)
        try:
            spec.loader.exec_module(module)
            
            if hasattr(module, 'run'):
                success = module.run(db)
                if success is not False: 
                    record_migration(db, filename)
                    print(f"✅ Hoàn tất: {filename}")
                else:
                    print(f"❌ Script {filename} trả về False. Dừng migration.")
                    break
            else:
                print(f"⚠️ Cảnh báo: File {filename} không có hàm 'run(db)'. Bỏ qua.")
                
        except Exception as e:
            print(f"❌ Lỗi nghiêm trọng khi chạy {filename}: {e}")
            break
            
    print("\n=== HOÀN TẤT ===")

if __name__ == "__main__":
    run_migrations()
