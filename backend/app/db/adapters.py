import numpy as np
from psycopg2.extensions import register_adapter, AsIs

# Đăng ký bộ chuyển đổi mảng numpy để tương thích với pgvector
def adapt_numpy_float64(numpy_float64):
    return AsIs(numpy_float64)

def adapt_numpy_int64(numpy_int64):
    return AsIs(numpy_int64)

def adapt_numpy_float32(numpy_float32):
    return AsIs(numpy_float32)

def adapt_numpy_array(numpy_array):
    return AsIs(str(numpy_array.tolist()))

def register_numpy_adapters():
    """Đăng ký adapters cho numpy types với psycopg2."""
    register_adapter(np.float64, adapt_numpy_float64)
    register_adapter(np.int64, adapt_numpy_int64)
    register_adapter(np.float32, adapt_numpy_float32)
    register_adapter(np.ndarray, adapt_numpy_array)
