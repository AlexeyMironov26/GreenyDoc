import sqlite3 
from contextlib import contextmanager
from protctd_keys import secretKey
import hashlib
import secrets

@contextmanager
def get_db():
    conn = sqlite3.connect("greenydoc.db", check_same_thread=False)  # ← Разрешаем
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def get_db_con():
    """Только для FastAPI Depends! Возвращает Готовое соединение"""
    conn = sqlite3.connect("greenydoc.db", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn

# Секретный ключ для подписи JWT (в продакшене хранить в .env!)
SECRET_KEY = secretKey  # Генерируем случайный ключ
ALGORITHM = "HS256"  # Алгоритм шифрования

def hash_password(password: str, salt: str = None) -> tuple:
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return hashed, salt

def verify_password(password: str, hashed_password: str, salt: str) -> bool:
    test_hash, _ = hash_password(password, salt)
    return test_hash == hashed_password