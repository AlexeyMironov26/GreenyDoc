# services.py
from repositories import UserRepository, RefreshTokenRepository
import datetime
from fastapi import HTTPException, Depends
import jwt
from common import ALGORITHM, SECRET_KEY, verify_password

# ========== DEPENDENCY INJECTION (DI) ==========

# 2. Репозитории 
def get_user_repo():
    return UserRepository()

def get_refresh_token_repo():
    return RefreshTokenRepository()


# 3. Сервис 
def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repo),
    refresh_repo: RefreshTokenRepository = Depends(get_refresh_token_repo)
):
    return AuthService(user_repo, refresh_repo)


# ========== AUTH SERVICE ==========

class AuthService:
    """Сервис аутентификации и работы с токенами"""
    
    def __init__(self, user_repo: UserRepository, refresh_token_repo: RefreshTokenRepository):
        self.user_repo = user_repo
        self.refresh_token_repo = refresh_token_repo
    
    def authenticate(self, username: str, password: str):
        user = self.user_repo.get_by_username(username)
        if not user:
            return None
        if not verify_password(password, user["password_hash"], user["salt"]):
            return None
        return dict(user)
    
    def create_access_token(self, user_id: int, username: str, role: str) -> str:
        payload = {
            "user_id": user_id,
            "username": username,
            "role": role,
            "type": "access",
            "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
        }
        return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    def create_refresh_token(self, user_id: int) -> str:
        expires_at = datetime.datetime.now() + datetime.timedelta(days=7)
        payload = {
            "user_id": user_id,
            "type": "refresh",
            "exp": expires_at
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        self.refresh_token_repo.save(user_id, token, expires_at)
        return token
    
    def refresh_access_token(self, refresh_token: str):
        try:
            payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != "refresh":
                raise ValueError("Invalid token type")
        except jwt.ExpiredSignatureError:
            raise HTTPException(401, "Refresh token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(401, "Invalid refresh token")
        
        stored_token = self.refresh_token_repo.get_valid(refresh_token)
        if not stored_token:
            raise HTTPException(401, "Refresh token revoked or expired")
        
        user = self.user_repo.get_by_id(payload["user_id"])
        if not user:
            raise HTTPException(401, "User not found")
        
        return self.create_access_token(user["id"], user["username"], user["role"])
    
    def rotate_refresh_token(self, old_refresh_token: str) -> str:
        self.refresh_token_repo.revoke(old_refresh_token)
        payload = jwt.decode(old_refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        return self.create_refresh_token(payload["user_id"])
    
    def logout(self, refresh_token: str):
        self.refresh_token_repo.revoke(refresh_token)
    
    def logout_all_devices(self, user_id: int):
        self.refresh_token_repo.revoke_all_user_tokens(user_id)