import sqlite3 
from contextlib import contextmanager
from protctd_keys import secretKey
import hashlib
import secrets
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv() 
ALLOWED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png"]
MAX_FILE_SIZE = 10 * 1024 * 1024 

def validate_file(content_type: str, file_size: int):
    if content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(400, f"Неподдерживаемый тип. Разрешены: {', '.join(ALLOWED_FILE_TYPES)}")
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(400, f"Файл слишком большой. Максимум {MAX_FILE_SIZE // (1024*1024)} MB")
    
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