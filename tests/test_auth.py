from common import hash_password, verify_password

# Модульные тесты сервисного слоя
class TestAuthModule:
    def test_hash_password(self):
        pwd_hash, salt = hash_password("secret")
        assert pwd_hash and salt
        assert verify_password("secret", pwd_hash, salt)

    def test_verify_wrong_password(self):
        pwd_hash, salt = hash_password("secret")
        assert not verify_password("wrong", pwd_hash, salt)

# 2.2 Интеграционные тесты эндпоинтов
class TestAuthEndpoints:
    def test_register_success(self, client):
        import time
        username = f"testuser_{int(time.time())}"  # ← уникальное имя
        resp = client.post("/api/auth/register", json={
            "username": username,
            "password": "pass123",
            "confirm_password": "pass123"
        })
        assert resp.status_code == 200

    def test_register_password_mismatch(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "newuser", "password": "pass123", "confirm_password": "wrong"
        })
        assert resp.status_code == 400

    def test_login_success(self, client):
        client.post("/api/auth/register", json={"username": "logintest", "password": "p", "confirm_password": "p"})
        resp = client.post("/api/auth/login", json={"username": "logintest", "password": "p"})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_login_invalid(self, client):
        resp = client.post("/api/auth/login", json={"username": "no", "password": "no"})
        assert resp.status_code == 401

    def test_refresh_token(self, client, test_user):
        login = client.post("/api/auth/login", json={"username": "testuser", "password": "test123"})
        refresh = login.json()["refresh_token"]
        resp = client.post("/api/auth/refresh", json={"refresh_token": refresh})
        assert resp.status_code == 200
        assert "access_token" in resp.json()