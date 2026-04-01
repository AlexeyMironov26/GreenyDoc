from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, status, Security, APIRouter, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import datetime
import uvicorn
import jwt 
from jwt.exceptions import InvalidTokenError
import hashlib
import secrets
import requests
import base64
from protctd_keys import api_key
import logging
import os
from fastapi.staticfiles import StaticFiles  
from enum import Enum
from services import AuthService, get_auth_service
from common import get_db, ALGORITHM, SECRET_KEY, verify_password, hash_password


os.makedirs("uploads", exist_ok=True)
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

#==== Roles =====
class UserRole(str, Enum):
    GUEST = "guest"
    USER = "user"
    ADMIN = "admin"

#права досутпа
class Permission(str, Enum):
    # Анализы
    ANALYSIS_CREATE = "analysis:create"
    ANALYSIS_READ_OWN = "analysis:read_own"
    ANALYSIS_READ_ALL = "analysis:read_all"
    ANALYSIS_UPDATE_OWN = "analysis:update_own"
    ANALYSIS_UPDATE_ALL = "analysis:update_all"
    ANALYSIS_DELETE_OWN = "analysis:delete_own"
    ANALYSIS_DELETE_ALL = "analysis:delete_all"
    
    # Пользователи
    USER_READ_OWN = "user:read_own"
    USER_READ_ALL =  "user:read_all"         
    USER_UPDATE_OWN = "user:update_own"
    USER_UPDATE_ALL = "user:update_all"
    USER_DELETE_OWN = "user:delete_own"
    USER_DELETE_ALL = "user:delete_all"
    
    # Администрирование
    #ADMIN_ACCESS = "admin:access"
    ROLE_MANAGE = "role:manage"

#соотношение прав к ролям с помощью словаря
ROLE_PERMISSIONS = {
    UserRole.GUEST: [
        Permission.ANALYSIS_CREATE,  
    ],

    UserRole.USER: [
        Permission.ANALYSIS_CREATE,
        Permission.ANALYSIS_READ_OWN,
        Permission.ANALYSIS_UPDATE_OWN,
        Permission.ANALYSIS_DELETE_OWN,
        Permission.USER_UPDATE_OWN,
        Permission.USER_DELETE_OWN,
    ],

    UserRole.ADMIN: [
        Permission.ANALYSIS_CREATE,
        Permission.ANALYSIS_READ_ALL,
        Permission.ANALYSIS_READ_OWN,      
        Permission.ANALYSIS_UPDATE_ALL,
        Permission.ANALYSIS_DELETE_ALL,
        Permission.USER_UPDATE_ALL,
        Permission.USER_READ_ALL,
        Permission.USER_DELETE_ALL,
        Permission.ROLE_MANAGE,
        Permission.ANALYSIS_UPDATE_OWN,
        Permission.ANALYSIS_DELETE_OWN,
        Permission.USER_UPDATE_OWN,
        Permission.USER_DELETE_OWN,
    ]
}

def require_permission(required_permission: Permission):
    async def dependency(current_user: dict = Depends(get_current_user)): #функция выполнится успешно только если get_current_user выполнится без исключений и передастся в параметр current_user текущий пользователь
        if not current_user:
            raise HTTPException(401, "Требуется авторизация")
        
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT role FROM users WHERE id = ?",
                (current_user["id"],)
            )
            row = cursor.fetchone()  
            user_role = row[0] if row else None  
        
        if required_permission not in ROLE_PERMISSIONS.get(UserRole(user_role), []):
            raise HTTPException(403, f"Нужно право: {required_permission.value}")
        
        return current_user
    
    return dependency

# Утилита для проверки прав
def check_permission(user_id: int, required_permission: Permission) -> bool:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT role FROM users WHERE id = ?",
            (user_id,)
        )
        row = cursor.fetchone()  
        user_role = row[0] if row else None  
    
    user_permissions = ROLE_PERMISSIONS.get(UserRole(user_role), [])
    return required_permission in user_permissions


#==== Roles =====


#Конфигурация Plant.id API
PLANT_ID_API_KEY = api_key  
PLANT_ID_API_URL = "https://api.plant.id/v2/identify"

def analyze_plant_disease(image_bytes: bytes) -> dict:
    """
    Анализирует изображение растения на наличие болезней
    через Plant.id API
    """
    try:
        # Кодируем изображение в base64
        encoded_image = base64.b64encode(image_bytes).decode('utf-8')
        
        # Подготавливаем запрос к API
        payload = {
            "images": [encoded_image],
            "modifiers": ["crops_fast", "similar_images"],
            "plant_language": "ru",
            "disease_details": ["cause", "treatment"]
        }
        
        headers = {
            "Content-Type": "application/json",
            "Api-Key": PLANT_ID_API_KEY
        }
        
        # Отправляем запрос
        response = requests.post(PLANT_ID_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        
        # Парсим результат
        if result.get("suggestions"):
            suggestion = result["suggestions"][0]
            
            # Проверяем на болезни
            is_healthy = True
            diseases = []
            
            if "disease" in suggestion:
                is_healthy = False
                diseases.append({
                    "name": suggestion["disease"]["name"],
                    "probability": suggestion["disease"]["probability"],
                    "cause": suggestion["disease"].get("cause", ""),
                    "treatment": suggestion["disease"].get("treatment", "")
                })
            
            return {
                "plant_name": suggestion["plant_name"],
                "probability": suggestion["probability"],
                "is_healthy": is_healthy,
                "diseases": diseases,
                "similar_images": suggestion.get("similar_images", [])[:3]
            }
        
        return {"error": "Не удалось определить растение"}
        
    except requests.exceptions.RequestException as e:
        return {"error": f"Ошибка API: {str(e)}"}
    except Exception as e:
        return {"error": f"Внутренняя ошибка: {str(e)}"}

#НАСТРОЙКИ БЕЗОПАСНОСТИ

ACCESS_TOKEN_EXPIRE_MINUTES = 15  # Время жизни токена

# Создаем security схему для авторизации
security = HTTPBearer()

app = FastAPI(title="GreenyDoc", version="1.0.0")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
# @app.middleware("http")
# async def db_session_middleware(request: Request, call_next):
#     # Создаём соединение и сохраняем в request.state
#     request.state.db = get_db_con()
#     response = await call_next(request)
#     # Закрываем соединение после ответа
#     if hasattr(request.state, "db"):
#         request.state.db.close()
#     return response

api_router = APIRouter()

#НАСТРОЙКА БАЗЫ ДАННЫХ SQLite
DATABASE_URL = "greenydoc.db"



def init_db():
    """Инициализация базы данных при старте"""
    with get_db() as conn:
        cursor = conn.cursor()
        # Таблица пользователей 
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,  
            salt TEXT NOT NULL,  
            role TEXT NOT NULL DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Таблица revoked токенов (для реализации логаута)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS revoked_tokens (
            token_id TEXT PRIMARY KEY,
            user_id INTEGER,
            revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        ''')
        #таблица отозванных access токенов нужна именно для того, чтобы можно было сделать токен недействительным раньше срока его истечения ( с помощью логаута), это полезно, например, при попадании токена к злоумышленнику, чтобы сразу после логаута пользователь смог пресечь вредоносную деятельность,
        # а не чтобы у злоумышленника ещё какое то время был доступ по токену в любом случае. каждый раз при попытке воспользоваться access токеном сервер проверяет не только не истёк ли он, но и не находится ли он в списке отозванных. 

        # refresh_tokens
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_hash TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            revoked BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        ''')

        # Таблица анализов растений
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS plant_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            image_path TEXT NOT NULL,
            image_url TEXT NOT NULL,
            disease_name TEXT,
            diagnosis TEXT NOT NULL,
            result TEXT NOT NULL,
            reference_link TEXT,
            treatment_link TEXT,
            status TEXT NOT NULL,
            date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        ''')

        # Создаем администратора по умолчанию 
        cursor.execute('''
        INSERT OR IGNORE INTO users (username, password_hash, salt, role) 
        VALUES ('admin1', ?, ?, 'admin')
        ''', hash_password("admin256")) #если админ с таким именем уже есть, то будет при попытке создания вылетать ошибка и благодаря ignore ошибка будет просто игнорироваться и ничего не произойдёт.

# Инициализируем базу при старте
init_db()

#УТИЛИТЫ ДЛЯ БЕЗОПАСНОСТИ

def hash_password(password: str, salt: str = None) -> tuple:
    """
    Хэширование пароля с использованием соли.
    Возвращает (хэш, соль)
    """
    if salt is None:
        salt = secrets.token_hex(16)  # Генерируем случайную соль
    
    # Создаем хэш: sha256(пароль + соль)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return hashed, salt


def create_access_token(data: dict) -> str:
    """
    Создание JWT токена.
    
    """
    to_encode = data.copy()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT role FROM users WHERE id = ?",
            (data["user_id"],)
        )
        user_role = cursor.fetchone()["role"]
    
    to_encode["role"] = user_role #добавляем в данные пользователя роль на 
    #этом этапе для безопасности, чтобы сам пользователь свою роль передать не мог
    
    # Добавляем время истечения токена
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    
    # Создаем токен
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """
    Верификация JWT токена.
    Возвращает payload если токен валиден, иначе выбрасывает исключение
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен истек",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )

def is_token_revoked(token_id: str) -> bool:
    """Проверяем, не отозван ли токен (для логаута)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT token_id FROM revoked_tokens WHERE token_id = ?",
            (token_id,)
        )
        return cursor.fetchone() is not None

def get_token_id(token: str) -> str:
    """Получаем уникальный ID токена (первые 16 символов хэша)"""
    return hashlib.sha256(token.encode()).hexdigest()[:16]

# зависимости для проверки авторизации

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """
    Зависимость FastAPI для получения текущего пользователя.
    Автоматически проверяет токен и возвращает данные пользователя.
    """
    token = credentials.credentials
    
    # Проверяем не отозван ли токен
    token_id = get_token_id(token)
    if is_token_revoked(token_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен отозван",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Верифицируем токен
    payload = verify_token(token)
    
    # Получаем пользователя из базы
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, username, role FROM users WHERE id = ?",
            (payload.get("user_id"),)
        )
        user = cursor.fetchone()
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Пользователь не найден",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "token_payload": payload
    }

#MIDDLEWARE

from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

# CORS middleware - разрешает запросы с фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],  # Разрешаем все методы
    allow_headers=["*"],  # Разрешаем все заголовки
)



# Trusted Host middleware - защита от host header атак
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*"],  # ← allowed_hosts!
)

#МОДЕЛИ ДАННЫХ 
class UserRegister(BaseModel):
    username: str
    password: str
    confirm_password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    """Модель для ответа с токеном"""
    access_token: str
    refresh_token: str 
    token_type: str = "bearer"
    expires_in: int = ACCESS_TOKEN_EXPIRE_MINUTES * 60  # в секундах
    user_id: int
    username: str
    role: str  

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

class UserWithRole(BaseModel):
    id: int
    username: str
    role: str
    created_at: str

class UpdateUserRoleRequest(BaseModel):
    user_id: int
    new_role: UserRole

class TokenData(BaseModel):
    """Модель данных внутри токена"""
    user_id: int
    username: str
    role: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
    confirm_new_password: str

class AnalysisResult(BaseModel):
    disease_name: Optional[str] = None
    reference_link: Optional[str] = None
    treatment_link: Optional[str] = None
    status: str  #"disease_found", "no_disease", "no_leaves", "error"

# Модели для ответов (чтобы возвращать не словари, а пайдентик модели)
class HealthResponse(BaseModel):
    status: str
    service: str

class ReadyResponse(HealthResponse):
    neural_network: Optional[str] = None
    error: Optional[str] = None

class AuthResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    username: Optional[str] = None

class AnalysisResponse(BaseModel):
    success: bool
    analysis_result: Optional[AnalysisResult] = None
    error: Optional[str] = None
    message: Optional[str] = None 

class HistoryItem(BaseModel):
    id: int
    image_url: str
    date: str
    diagnosis: str
    result: str

class HistoryResponse(BaseModel):
    success: bool
    history: List[HistoryItem]

class MessageResponse(BaseModel):
    success: bool
    message: str

#МОДЕЛИ ДЛЯ CRUD
class AnalysisCreateRequest(BaseModel):
    user_id: Optional[int] = None
    session_token: Optional[str] = None  

class AnalysisUpdateRequest(BaseModel):
    disease_name: Optional[str] = None
    status: Optional[str] = None

class AnalysisDBResponse(BaseModel):
    id: int
    user_id: int
    image_path: str
    image_url: str  
    disease_name: Optional[str] = None
    diagnosis: Optional[str] = None  
    reference_link: Optional[str] = None
    treatment_link: Optional[str] = None
    status: str
    created_at: str
#ЭНДПОЙНТЫ

#health check (публичный - не требует авторизации)
@api_router.get("/health/live", response_model=HealthResponse)
def liveness_probe():
    return HealthResponse(status="ALIVE", service="GreenyDoc")

@api_router.get("/health/ready", response_model=ReadyResponse)
def ready_check():
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
        
        return ReadyResponse(
            status="READY", 
            service="GreenyDoc",
            neural_network="AVAILABLE"
        )
    except Exception as e:
        error_response = ReadyResponse(
            status="NOT_READY",
            service="GreenyDoc", 
            error=str(e)
        )
        return JSONResponse(
            status_code=503,
            content=error_response.dict()
        )

#АВТОРИЗАЦИОННЫЕ ЭНДПОЙНТЫ 

@api_router.post("/api/auth/register", response_model=Token)
async def register_user(user_data: UserRegister,
auth_service: AuthService = Depends(get_auth_service)
):
    """Регистрация нового пользователя с возвратом JWT токена"""
    if user_data.password != user_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пароли не совпадают"
        )
    
    try:
        # Хэшируем пароль
        password_hash, salt = hash_password(user_data.password)
        
        # Сохраняем в SQLite (роль по умолчанию 'user')
        with get_db() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT id FROM users WHERE username = ?", (user_data.username,))
            if cursor.fetchone():
                raise HTTPException(400, "Пользователь уже существует")
            
            cursor.execute(
                "INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, ?)",
                (user_data.username, password_hash, salt, UserRole.USER.value)
            )
            user_id = cursor.lastrowid

            cursor.execute(
                "SELECT role FROM users WHERE id = ?",
                (user_id,)
            )
            role = cursor.fetchone()["role"]
        
        # Создаем JWT токен с ролью
        access_token = auth_service.create_access_token(user_id, user_data.username, role)
        refresh_token = auth_service.create_refresh_token(user_id)
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            user_id=user_id,
            username=user_data.username,
            role=role
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, "Ошибка сервера")
    
@api_router.post("/api/auth/login", response_model=Token)
async def login_user(
    user_data: UserLogin,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Вход с выдачей access + refresh токенов"""
    user = auth_service.authenticate(user_data.username, user_data.password)
    if not user:
        raise HTTPException(401, "Неверный логин или пароль")
    
    access_token = auth_service.create_access_token(user["id"], user["username"], user["role"])
    refresh_token = auth_service.create_refresh_token(user["id"])
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,  # ← добавить поле в модель Token
        user_id=user["id"],
        username=user["username"],
        role=user["role"],
        expires_in=15 * 60
    )

@api_router.post("/api/auth/logout", response_model=MessageResponse)
async def logout_user(
    request: LogoutRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Выход - отзыв refresh токена"""
    auth_service.logout(request.refresh_token)
    return MessageResponse(success=True, message="Вы успешно вышли")

@api_router.post("/api/auth/refresh", response_model=Token)
async def refresh_token(
    request: RefreshRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Обновление access токена через refresh токен"""
    new_access_token = auth_service.refresh_access_token(request.refresh_token)
    
    # Опционально: ротация refresh токена
    new_refresh_token = auth_service.rotate_refresh_token(request.refresh_token)
    
    # Получаем данные пользователя из нового access токена
    payload = jwt.decode(new_access_token, SECRET_KEY, algorithms=[ALGORITHM])
    
    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user_id=payload["user_id"],
        username=payload["username"],
        role=payload["role"],
        expires_in=15 * 60
    )

#ЗАЩИЩЕННЫЕ ЭНДПОЙНТЫ (требуют авторизации) 

@api_router.post("/api/user/change-password", response_model=MessageResponse)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """Смена пароля - требует авторизации"""
    if password_data.new_password != password_data.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Новые пароли не совпадают"
        )
    
    try:
        # Получаем текущие данные пользователя
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT password_hash, salt FROM users WHERE id = ?",
                (current_user["id"],)
            )
            user_data = cursor.fetchone()
            
            # Проверяем старый пароль
            if not verify_password(password_data.old_password, 
                                 user_data["password_hash"], 
                                 user_data["salt"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Неверный старый пароль"
                )
            
            # Хэшируем новый пароль
            new_password_hash, new_salt = hash_password(password_data.new_password)
            
            # Обновляем в базе
            cursor.execute(
                "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?",
                (new_password_hash, new_salt, current_user["id"])
            )
        
        return MessageResponse(success=True, message="Пароль успешно изменен")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@api_router.post("/api/user/delete-account", response_model=MessageResponse)
async def delete_account(current_user: dict = Depends(get_current_user),
auth_service: AuthService = Depends(get_auth_service)             
):
    """Удаление аккаунта - требует авторизации"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # 1. Отзываем все refresh tokens пользователя
            cursor.execute(
                "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?",
                (current_user["id"],)
            )

            # Удаляем анализы пользователя
            cursor.execute(
                "DELETE FROM plant_analyses WHERE user_id = ?",
                (current_user["id"],)
            )
            # Удаляем пользователя
            cursor.execute(
                "DELETE FROM users WHERE id = ?",
                (current_user["id"],)
            )
            
            if cursor.rowcount == 0: #если количество строк, изменённых последним execute delete запросом равно 0, то значит этого пользователя и не было в таблице, следовательно выкидываем исключение 
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Пользователь не найден"
                )
        
        return MessageResponse(success=True, message="Аккаунт успешно удален")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(e))

# CRUD ЭНДПОЙНТЫ С АВТОРИЗАЦИЕЙ
async def optional_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Optional[dict]:
    """
    Опциональная аутентификация: возвращает пользователя если токен валидный,
    или None если токена нет/невалидный
    """
    if not credentials:
        return None
    
    try:
        #Пробуем проверить токен
        token = credentials.credentials
        payload = verify_token(token)
        
        #Получаем пользователя из базы
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, username FROM users WHERE id = ?",
                (payload.get("user_id"),)
            )
            user = cursor.fetchone()
            
            if user:
                return {"id": user["id"], "username": user["username"]}
            else:
                return None
                
    except Exception:
        # Любая ошибка = гость
        return None
    
# CREATE - Создание нового анализа 
@api_router.post("/api/analyses", response_model=AnalysisResponse)
async def create_analysis(
    file: UploadFile = File(...),
    current_user: Optional[dict] = Depends(optional_auth)  
):
    """
    Анализ изображения растения. (объединённый)
    Для гостей - только анализ без сохранения. 
    Для авторизованных пользователей: анализ, а также сохранение в историю
    """
    try:
        image_bytes = await file.read()
        
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Файл слишком большой")
        
        ai_result = analyze_plant_disease(image_bytes)
        
        if "error" in ai_result:
            return AnalysisResponse(success=False, error=ai_result["error"])
        
        # Форматирование результата (общая логика для всех)
        if not ai_result["is_healthy"] and ai_result["diseases"]:
            disease = ai_result["diseases"][0]
            analysis_result = AnalysisResult(
                status="disease_found",
                disease_name=f"{disease['name']} (вероятность: {disease['probability']:.0%})",
                reference_link="https://plant.id/disease-info",
                treatment_link="https://plant.id/treatment"
            )
        else:
            analysis_result = AnalysisResult(
                status="no_disease",
                disease_name=f"Растение здорово! Определено: {ai_result['plant_name']}"
            )
        
        # Сохраняем только если пользователь авторизован
        if current_user:
            # Сохраняем анализ
            import os
            import uuid
            
            os.makedirs("uploads", exist_ok=True)
            
            file_extension = os.path.splitext(file.filename)[1] or '.jpg'
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = f"uploads/{unique_filename}"
            
            with open(file_path, "wb") as f:
                f.write(image_bytes)
            
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO plant_analyses 
                    (user_id, image_path, image_url, disease_name, diagnosis, result, 
                     reference_link, treatment_link, status, date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    current_user["id"],
                    file_path,
                    f"/uploads/{unique_filename}",
                    analysis_result.disease_name,
                    ai_result["plant_name"],
                    "disease_found" if not ai_result["is_healthy"] else "no_disease",
                    analysis_result.reference_link,
                    analysis_result.treatment_link,
                    analysis_result.status,
                    datetime.datetime.now().strftime("%Y-%m-%d") 
                ))
                conn.commit()
            
            return AnalysisResponse(
                success=True,
                analysis_result=analysis_result,
                message="Анализ сохранен в историю"
            )
        
        # Для гостей - просто возвращаем результат
        return AnalysisResponse(
            success=True,
            analysis_result=analysis_result,
            message="Войдите в аккаунт, чтобы сохранять анализы в историю"
        )
        
    except Exception as e:
        return AnalysisResponse(
            success=False,
            error=str(e)
        )
    
# Просмотр своих анализов
@api_router.get("/api/analyses/my", response_model=List[dict])
async def read_my_analyses(
    current_user: dict = Depends(require_permission(Permission.ANALYSIS_READ_OWN)) # FastAPI получает request
# FastAPI смотрит: "для этого эндпойнта есть зависимость dependency"
# FastAPI вызывает dependency и САМ ПЕРЕДАЕТ в неё current_user:

):
    """Получение всех анализов текущего пользователя"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT 
                    id,
                    image_url,
                    disease_name,
                    status,
                    created_at,
                    diagnosis
                FROM plant_analyses 
                WHERE user_id = ? 
                ORDER BY created_at DESC
                """,
                (current_user["id"],)
            )
            analyses = cursor.fetchall()
        
        result = []
        for a in analyses:
            result.append({
                "id": str(a['id']),
                "image_url": a['image_url'] or "",
                "disease_name": a['disease_name'] or "",
                "status": a['status'] or "unknown",
                "created_at": a['created_at'],
                "diagnosis": a['diagnosis'] or ""
            })

        return result
        
    except Exception as e:
        print(f"Error in read_my_analyses: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Просмотр всех анализов (только админ)
@api_router.get("/api/analyses/all", response_model=List[dict])
async def read_all_analyses(
    current_user: dict = Depends(require_permission(Permission.ANALYSIS_READ_ALL))
):
    """Получение всех анализов всех пользователей (только админ)"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    pa.id,
                    pa.image_url,
                    pa.disease_name,
                    pa.status,
                    pa.created_at,
                    pa.diagnosis,
                    u.username as owner
                FROM plant_analyses pa
                JOIN users u ON pa.user_id = u.id
                ORDER BY pa.created_at DESC
            """)
            analyses = cursor.fetchall()
        
        result = []
        for a in analyses:
            result.append({
                "id": str(a['id']),
                "image_url": a['image_url'] or "",
                "disease_name": a['disease_name'] or "",
                "status": a['status'] or "unknown",
                "created_at": a['created_at'],
                "diagnosis": a['diagnosis'] or "",
                "owner": a['owner'] or ""
            })
        
        return result
        
    except Exception as e:
        print(f"Error in read_all_analyses: {e}")
        raise HTTPException(status_code=500, detail=str(e))


    #READ - one user analyses
@api_router.get("/api/analyses/{analysis_id}", response_model=AnalysisDBResponse)
async def read_analysis(
    analysis_id: int,
    current_user: dict = Depends(get_current_user)  #Требуем авторизации (если авторизация не прошла успешно, то функция не выполнится)
):
    """Получение конкретного анализа по ID (только свои анализы)"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM plant_analyses WHERE id = ? AND user_id = ?",
                (analysis_id, current_user["id"])  # Проверяем что анализ принадлежит пользователю
            )
            analysis = cursor.fetchone()
            
            if not analysis:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Анализ не найден или у вас нет доступа"
                )
        
        # СОЗДАЁМ ПОЛНЫЙ image_url 
        image_url = analysis['image_url']
        if not image_url and analysis['image_path']:
            image_url = f"/{analysis['image_path'].lstrip('/')}"
        
        return AnalysisDBResponse(
            id=analysis['id'],
            user_id=analysis['user_id'],
            image_path=analysis['image_path'],
            image_url=image_url,  
            disease_name=analysis['disease_name'],
            diagnosis=analysis['diagnosis'],  
            reference_link=analysis['reference_link'],
            treatment_link=analysis['treatment_link'],
            status=analysis['status'],
            created_at=analysis['created_at']
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

# UPDATE - 
# Обновление анализа с проверкой владельца
@api_router.put("/api/analyses/{analysis_id}", response_model=MessageResponse)
async def update_analysis(
    analysis_id: int,
    update_data: AnalysisUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Обновление анализа"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Проверяем существование
            cursor.execute(
                "SELECT user_id FROM plant_analyses WHERE id = ?",
                (analysis_id,)
            )
            analysis = cursor.fetchone()
            
            if not analysis:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Анализ не найден"
                )
            
            # Проверяем права
            is_owner = analysis["user_id"] == current_user["id"]
            can_update_all = check_permission(current_user["id"], Permission.ANALYSIS_UPDATE_ALL)
            
            if not (is_owner and check_permission(current_user["id"], Permission.ANALYSIS_UPDATE_OWN)) and not can_update_all:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Недостаточно прав для обновления этого анализа"
                )
            
            # Формируем запрос обновления
            updates = []
            params = []
            
            if update_data.disease_name is not None:
                updates.append("disease_name = ?")
                params.append(update_data.disease_name)
            
            if update_data.status is not None:
                updates.append("status = ?")
                params.append(update_data.status)
            
            if updates:
                params.append(analysis_id)
                query = f"UPDATE plant_analyses SET {', '.join(updates)} WHERE id = ?"
                
                # Если пользователь не админ, добавляем проверку владельца
                if not can_update_all:
                    query += " AND user_id = ?"
                    params.append(current_user["id"])
                
                cursor.execute(query, params)
        
        return MessageResponse(success=True, message="Анализ обновлен")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# DELETE - 
# Удаление анализа с проверкой прав
@api_router.delete("/api/analyses/{analysis_id}", response_model=MessageResponse)
async def delete_analysis(
    analysis_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Удаление анализа"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Проверяем существование
            cursor.execute(
                "SELECT user_id FROM plant_analyses WHERE id = ?",
                (analysis_id,)
            )
            analysis = cursor.fetchone()
            
            if not analysis:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Анализ не найден"
                )
            
            # Проверяем права
            is_owner = analysis["user_id"] == current_user["id"]
            can_delete_all = check_permission(current_user["id"], Permission.ANALYSIS_DELETE_ALL)
            
            if not is_owner and not can_delete_all:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Недостаточно прав для удаления этого анализа"
                )
            
            # Формируем запрос удаления
            query = "DELETE FROM plant_analyses WHERE id = ?"
            params = [analysis_id]
            
            # Если пользователь не админ, добавляем проверку владельца
            if not can_delete_all:
                query += " AND user_id = ?"
                params.append(current_user["id"])
            
            cursor.execute(query, params)
            
            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Анализ не найден или у вас нет прав"
                )
        
        return MessageResponse(success=True, message="Анализ удален")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# получение информации о роли пользователя (админ)
@api_router.get("/api/admin/users", response_model=List[UserWithRole])
async def get_all_users(
    current_user: dict = Depends(require_permission(Permission.USER_READ_ALL))
):
    """Получение списка всех пользователей (только админ)"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, username, role, created_at FROM users ORDER BY created_at DESC"
            )
            users = cursor.fetchall()
        
        result = []
        for user in users:
            result.append({
                "id": user["id"],
                "username": user["username"],
                "role": user["role"],
                "created_at": user["created_at"]
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Изменение роли пользователя (админ)
@api_router.put("/api/admin/users/{user_id}/role", response_model=MessageResponse)
async def update_user_role(
    user_id: int,
    role_request: UpdateUserRoleRequest,
    current_user: dict = Depends(require_permission(Permission.ROLE_MANAGE))
):
    """Изменение роли пользователя (только админ)"""
    try:
        # Нельзя изменить роль самого себя
        if user_id == current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя изменить свою собственную роль"
            )
        
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Проверяем существование пользователя
            cursor.execute(
                "SELECT id FROM users WHERE id = ?",
                (user_id,)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Пользователь не найден"
                )
            
            # Обновляем роль
            cursor.execute(
                "UPDATE users SET role = ? WHERE id = ?",
                (role_request.new_role.value, user_id)
            )
        
        return MessageResponse(success=True, message="Роль пользователя обновлена")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Удаление пользователя (админ)
@api_router.delete("/api/admin/users/{user_id}", response_model=MessageResponse)
async def delete_user_account(
    user_id: int,
    current_user: dict = Depends(require_permission(Permission.USER_DELETE_ALL))
):
    """Удаление аккаунта пользователя (только админ)"""
    try:
        # Нельзя удалить самого себя
        if user_id == current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя удалить свой собственный аккаунт"
            )
        
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Удаляем анализы пользователя
            cursor.execute(
                "DELETE FROM plant_analyses WHERE user_id = ?",
                (user_id,)
            )
            
            # Удаляем пользователя
            cursor.execute(
                "DELETE FROM users WHERE id = ?",
                (user_id,)
            )
            
            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Пользователь не найден"
                )
        
        return MessageResponse(success=True, message="Аккаунт пользователя удален")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
#корневой эндпойнт
@app.get("/")
async def root():
    return {
        "message": "GreenyDoc API Server is running", 
        "docs": "http://localhost:8000/docs",
        "health_check": "http://localhost:8000/health/live",
        "authentication": "JWT Bearer Token"
    }

#подключим роутер к приложению
app.include_router(api_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)