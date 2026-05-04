"""
File mẫu cho Migration Script.
Tên file phải bắt đầu bằng 4 chữ số, ví dụ: 0001_example.py
Mỗi script phải có một hàm async def run(db) hoặc def run(db)
"""
from google.cloud import firestore

def run(db: firestore.Client):
    """
    Thực thi logic thay đổi dữ liệu.
    Nên sử dụng batch để tối ưu hiệu suất ghi.
    """
    print("  -> Chạy migration mẫu (0001_example)...")
    
    # 1. Khởi tạo batch
    # batch = db.batch()
    
    # 2. Query documents cần thay đổi
    # users_ref = db.collection('users')
    # docs = users_ref.stream()
    
    # 3. Lặp qua documents và thêm vào batch
    # count = 0
    # for doc in docs:
    #     doc_ref = users_ref.document(doc.id)
    #     batch.update(doc_ref, {"is_active": True})
    #     count += 1
    #     
    #     # Nếu số lượng lớn hơn 500 (giới hạn của batch), commit và tạo batch mới
    #     if count >= 500:
    #         batch.commit()
    #         batch = db.batch()
    #         count = 0
            
    # 4. Commit phần còn lại
    # if count > 0:
    #     batch.commit()
    
    print("  -> (Mẫu) Hoàn tất update. Return True để lưu lịch sử.")
    
    # Trả về True nếu thành công để lưu lại vào db
    return True
