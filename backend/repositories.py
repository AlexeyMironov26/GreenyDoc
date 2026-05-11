import datetime
import hashlib
from common import get_db 


class UserRepository:    
    def get_by_username(self, username: str):
        with get_db() as conn:  
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, username, password_hash, salt, role, created_at FROM users WHERE username = ?",
                (username,)
            )
            return cursor.fetchone()
    
    def get_by_id(self, user_id: int):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, username, role, created_at FROM users WHERE id = ?",
                (user_id,)
            )
            return cursor.fetchone()
    
    def create(self, username: str, password_hash: str, salt: str, role: str = 'user'):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, ?)",
                (username, password_hash, salt, role)
            )
            conn.commit()
            return cursor.lastrowid
    
    def update_password(self, user_id: int, password_hash: str, salt: str):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?",
                (password_hash, salt, user_id)
            )
            conn.commit()
    
    def delete(self, user_id: int):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()


class RefreshTokenRepository:
    def _hash_token(self, token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()
    
    def save(self, user_id: int, token: str, expires_at: datetime.datetime):
        with get_db() as conn:
            token_hash = self._hash_token(token)
            cursor = conn.cursor()
            # Сначала удаляем старый токен пользователя (если есть)
            cursor.execute(
                "DELETE FROM refresh_tokens WHERE user_id = ?",
                (user_id,)
            )
            # Потом вставляем новый
            cursor.execute(
                "INSERT INTO refresh_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
                (token_hash, user_id, expires_at)
            )
            conn.commit()
            return cursor.lastrowid
    
    def get_valid(self, token: str):
        with get_db() as conn:
            token_hash = self._hash_token(token)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = FALSE AND expires_at > ?",
                (token_hash, datetime.datetime.now())
            )
            return cursor.fetchone()
    
    def revoke(self, token: str):
        with get_db() as conn:
            token_hash = self._hash_token(token)
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?",
                (token_hash,)
            )
            conn.commit()
    
    def revoke_all_user_tokens(self, user_id: int):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?",
                (user_id,)
            )
            conn.commit()