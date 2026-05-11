import atexit
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend'))
# Мок botocore.client ДО импорта main
from unittest.mock import MagicMock, patch

# Создаём мок для s3_client
mock_s3_client = MagicMock()
mock_s3_client.head_bucket.return_value = None
mock_s3_client.put_object.return_value = None
mock_s3_client.generate_presigned_url.return_value = "https://mock-url.com/image.jpg"
mock_s3_client.delete_object.return_value = None

# Запускаем мок глобально
_s3_mock = patch('boto3.client', return_value=mock_s3_client)
_s3_mock.start()
atexit.register(lambda: _s3_mock.stop()) 

import pytest
from fastapi.testclient import TestClient
from main import app
from common import get_db, hash_password
import sqlite3

# ========== БАЗА ДАННЫХ ==========
@pytest.fixture
def test_db():
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
        );
        CREATE TABLE plant_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            image_path TEXT NOT NULL,
            image_url TEXT NOT NULL,
            disease_name TEXT,
            diagnosis TEXT NOT NULL,
            result TEXT NOT NULL,
            status TEXT NOT NULL,
            date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_hash TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            revoked BOOLEAN DEFAULT FALSE
        );
    """)
    conn.commit()

    def override_get_db():
        try:
            yield conn
            conn.commit()
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    yield conn
    conn.close()
    app.dependency_overrides.clear()

# ========== КЛИЕНТ ==========
@pytest.fixture
def client(test_db):
    return TestClient(app)

# ========== ПОЛЬЗОВАТЕЛИ ==========
@pytest.fixture
def test_user(test_db):
    pwd_hash, salt = hash_password("test123")
    cur = test_db.cursor()
    cur.execute(
        "INSERT INTO users (username, password_hash, salt, role) VALUES (?,?,?,?)",
        ("testuser", pwd_hash, salt, "user")
    )
    test_db.commit()
    return {"id": cur.lastrowid, "username": "testuser", "role": "user"}

@pytest.fixture
def test_admin(test_db):
    pwd_hash, salt = hash_password("admin123")
    cur = test_db.cursor()
    cur.execute(
        "INSERT INTO users (username, password_hash, salt, role) VALUES (?,?,?,?)",
        ("admin", pwd_hash, salt, "admin")
    )
    test_db.commit()
    return {"id": cur.lastrowid, "username": "admin", "role": "admin"}

# ========== ТОКЕНЫ ==========
@pytest.fixture
def user_token(client, test_user):
    resp = client.post("/api/auth/login", json={"username": "testuser", "password": "test123"})
    if resp.status_code != 200:
        pytest.skip("Не удалось получить токен пользователя")
    return resp.json()["access_token"]

@pytest.fixture
def admin_token(client, test_admin):
    """Токен администратора (использует test_admin)"""
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    if resp.status_code != 200:
        pytest.skip("Не удалось получить токен администратора")
    return resp.json()["access_token"]

# ========== МОКИ ==========
@pytest.fixture
def mock_plant_id():
    with patch("common.analyze_plant_disease") as mock:
        mock.return_value = {
            "plant_name": "Роза",
            "is_healthy": False,
            "diseases": [{"name": "Мучнистая роса", "probability": 0.85}]
        }
        yield mock

# ========== ОЧИСТКА ТАБЛИЦ (AUTOUSE) ==========
@pytest.fixture(autouse=True)
def clean_tables(test_db):
    """Очистка таблиц ПЕРЕД каждым тестом"""
    test_db.execute("DELETE FROM refresh_tokens")
    test_db.execute("DELETE FROM plant_analyses")
    test_db.execute("DELETE FROM users")
    test_db.commit()
    yield
    # После теста тоже очищаем 
    test_db.execute("DELETE FROM refresh_tokens")
    test_db.execute("DELETE FROM plant_analyses")
    test_db.execute("DELETE FROM users")
    test_db.commit()

def pytest_unconfigure(config):
    _s3_mock.stop()