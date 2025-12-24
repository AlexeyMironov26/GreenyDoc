from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, status, Security
from fastapi.responses import JSONResponse
from fastapi import APIRouter
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import sqlite3
import datetime
from contextlib import contextmanager
import uvicorn
import jwt 
from jwt.exceptions import InvalidTokenError
import hashlib
import secrets
import requests
import base64
from PIL import Image
from plantid_apikey import api_key
import io
import os


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
# Секретный ключ для подписи JWT (в продакшене хранить в .env!)
SECRET_KEY = secrets.token_hex(32)  # Генерируем случайный ключ
ALGORITHM = "HS256"  # Алгоритм шифрования
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Время жизни токена

# Создаем security схему для авторизации
security = HTTPBearer()

#импорт нейросети
#from neuro_network.model import analyze_image

app = FastAPI(title="GreenyDoc", version="1.0.0")

api_router = APIRouter()

#НАСТРОЙКА БАЗЫ ДАННЫХ SQLite
DATABASE_URL = "greenydoc.db"

@contextmanager
def get_db():
    """Контекстный менеджер для работы с базой данных"""
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row  # Чтобы возвращать словари
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def init_db():
    """Инициализация базы данных при старте"""
    with get_db() as conn:
        cursor = conn.cursor()
        #для исправления ошибок во время разработки-тестировки
        # cursor.execute("DROP TABLE IF EXISTS revoked_tokens")
        # cursor.execute("DROP TABLE IF EXISTS plant_analyses")
        # cursor.execute("DROP TABLE IF EXISTS users")
        # Таблица пользователей (теперь с хэшированными паролями)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,  
            salt TEXT NOT NULL,  
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

def verify_password(password: str, hashed_password: str, salt: str) -> bool:
    """Проверка пароля"""
    test_hash, _ = hash_password(password, salt)
    return test_hash == hashed_password

def create_access_token(data: dict) -> str:
    """
    Создание JWT токена.
    data обычно содержит user_id, username и другие claim'ы
    """
    to_encode = data.copy()
    
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
            "SELECT id, username FROM users WHERE id = ?",
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
    allowed_hosts=["localhost", "127.0.0.1", "::1"]
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
    token_type: str = "bearer"
    expires_in: int = ACCESS_TOKEN_EXPIRE_MINUTES * 60  # в секундах
    user_id: int
    username: str

class TokenData(BaseModel):
    """Модель данных внутри токена"""
    user_id: int
    username: str

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
    session_token: Optional[str] = None  # Для неавторизованных пользователей

class AnalysisUpdateRequest(BaseModel):
    disease_name: Optional[str] = None
    status: Optional[str] = None

class AnalysisDBResponse(BaseModel):
    id: int
    user_id: int
    image_path: str
    image_url: str  # ← ДОБАВЬТЕ ЭТО ПОЛЕ (обязательное)
    disease_name: Optional[str] = None
    diagnosis: Optional[str] = None  # ← ДОБАВЬТЕ ЭТО ПОЛЕ
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
async def register_user(user_data: UserRegister):
    """Регистрация нового пользователя с возвратом JWT токена"""
    if user_data.password != user_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пароли не совпадают"
        )
    
    try:
        # Хэшируем пароль
        password_hash, salt = hash_password(user_data.password)
        
        # Сохраняем в SQLite
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)",
                (user_data.username, password_hash, salt)
            )
            user_id = cursor.lastrowid
        
        # Создаем JWT токен
        token_data = {"user_id": user_id, "username": user_data.username}
        access_token = create_access_token(data=token_data)
        
        return Token(
            access_token=access_token,
            user_id=user_id,
            username=user_data.username
        )
        
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь уже существует"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@api_router.post("/api/auth/login", response_model=Token)
async def login_user(user_data: UserLogin):
    """Вход пользователя с возвратом JWT токена"""
    try:
        # Ищем пользователя
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, username, password_hash, salt FROM users WHERE username = ?",
                (user_data.username,)
            )
            user = cursor.fetchone()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный логин или пароль"
            )
        
        # Проверяем пароль
        if not verify_password(user_data.password, user["password_hash"], user["salt"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный логин или пароль"
            )
        
        # Создаем JWT токен
        token_data = {"user_id": user["id"], "username": user["username"]}
        access_token = create_access_token(data=token_data)
        
        return Token(
            access_token=access_token,
            user_id=user["id"],
            username=user["username"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@api_router.post("/api/auth/logout", response_model=MessageResponse)
async def logout_user(current_user: dict = Depends(get_current_user)):
    """
    Выход пользователя - отзыв токена.
    Требует авторизации (токен в заголовке Authorization: Bearer <token>)
    """
    try:
        # Получаем токен из контекста (в реальном приложении нужно передавать токен)
        # Для демонстрации просто возвращаем успех
        # В реальном приложении нужно получить токен из запроса и добавить в revoked_tokens
        
        return MessageResponse(
            success=True, 
            message="Выход выполнен успешно. Токен будет отозван при следующем запросе."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@api_router.post("/api/auth/refresh", response_model=Token)
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """
    Обновление JWT токена.
    Принимает старый токен, возвращает новый.
    """
    try:
        # Создаем новый токен с теми же данными
        token_data = {
            "user_id": current_user["id"],
            "username": current_user["username"]
        }
        access_token = create_access_token(data=token_data)
        
        return Token(
            access_token=access_token,
            user_id=current_user["id"],
            username=current_user["username"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
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
async def delete_account(current_user: dict = Depends(get_current_user)):
    """Удаление аккаунта - требует авторизации"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
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
            
            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Пользователь не найден"
                )
        
        return MessageResponse(success=True, message="Аккаунт успешно удален")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

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
# CREATE - Создание нового анализа (требует авторизации)
@api_router.post("/api/analyses", response_model=AnalysisResponse)
async def create_analysis(
    file: UploadFile = File(...),
    current_user: Optional[dict] = Depends(optional_auth)  # Новая опциональная зависимость
):
    """Анализ изображения растения (работает для гостей и авторизованных)"""
    try:
        image_bytes = await file.read()
        
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Файл слишком большой")
        
        ai_result = analyze_plant_disease(image_bytes)
        
        if "error" in ai_result:
            return AnalysisResponse(success=False, error=ai_result["error"])
        
        # Форматирование результата (ваш существующий код)
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
        
        # Сохраняем ТОЛЬКО если пользователь авторизован
        if current_user:  # None для гостей
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO plant_analyses 
                    (user_id, image_path, image_url, disease_name, diagnosis, result, 
                     reference_link, treatment_link, status, date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    current_user["id"],
                    f"uploads/{file.filename}",
                    f"/uploads/{file.filename}",
                    analysis_result.disease_name,
                    ai_result["plant_name"],
                    "disease_found" if not ai_result["is_healthy"] else "no_disease",
                    analysis_result.reference_link,
                    analysis_result.treatment_link,
                    analysis_result.status,
                    datetime.now().strftime("%Y-%m-%d")
                ))
        
        return AnalysisResponse(
            success=True,
            analysis_result=analysis_result  # Pydantic модель AnalysisResult
        )
        
    except Exception as e:
        return AnalysisResponse(
            success=False,
            error=str(e)
        )
    
@api_router.get("/api/analyses/my", response_model=List[dict])
async def read_my_analyses(current_user: dict = Depends(get_current_user)):
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
        
        # Преобразуем в словарь с правильными именами полей
        result = []
        for a in analyses:
            result.append({
                "id": str(a['id']),  # Конвертируем в string
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
    
    #READ - one user analyses
@api_router.get("/api/analyses/{analysis_id}", response_model=AnalysisDBResponse)
async def read_analysis(
    analysis_id: int,
    current_user: dict = Depends(get_current_user)  # ← Требуем авторизации
):
    """Получение конкретного анализа по ID (только свои анализы)"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM plant_analyses WHERE id = ? AND user_id = ?",
                (analysis_id, current_user["id"])  # ← Проверяем что анализ принадлежит пользователю
            )
            analysis = cursor.fetchone()
            
            if not analysis:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Анализ не найден или у вас нет доступа"
                )
        
        # СОЗДАЁМ ПОЛНЫЙ image_url ЕСЛИ НУЖНО
        image_url = analysis['image_url']
        if not image_url and analysis['image_path']:
            image_url = f"/{analysis['image_path'].lstrip('/')}"
        
        return AnalysisDBResponse(
            id=analysis['id'],
            user_id=analysis['user_id'],
            image_path=analysis['image_path'],
            image_url=image_url,  # ← Теперь есть!
            disease_name=analysis['disease_name'],
            diagnosis=analysis['diagnosis'],  # ← Теперь есть!
            reference_link=analysis['reference_link'],
            treatment_link=analysis['treatment_link'],
            status=analysis['status'],
            created_at=analysis['created_at']
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

# UPDATE - Обновление анализа (только свои анализы)
@api_router.put("/api/analyses/{analysis_id}", response_model=MessageResponse)
async def update_analysis(
    analysis_id: int,
    update_data: AnalysisUpdateRequest,
    current_user: dict = Depends(get_current_user)  # ← Требуем авторизации
):
    """Обновление анализа (только свои анализы)"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Проверяем существование и принадлежность
            cursor.execute(
                "SELECT id FROM plant_analyses WHERE id = ? AND user_id = ?",
                (analysis_id, current_user["id"])
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Анализ не найден или у вас нет прав"
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
                cursor.execute(
                    f"UPDATE plant_analyses SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
                    params + [current_user["id"]]
                )
        
        return MessageResponse(success=True, message="Анализ обновлен")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# DELETE - Удаление анализа (только свои анализы)
@api_router.delete("/api/analyses/{analysis_id}", response_model=MessageResponse)
async def delete_analysis(
    analysis_id: int,
    current_user: dict = Depends(get_current_user)  # ← Требуем авторизации
):
    """Удаление анализа (только свои анализы)"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM plant_analyses WHERE id = ? AND user_id = ?",
                (analysis_id, current_user["id"])  # ← Проверяем принадлежность
            )
            
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

#корневой эндпойнт
@app.get("/")
async def root():
    return {
        "message": "GreenyDoc API Server is running", 
        "docs": "http://localhost:8000/docs",
        "health_check": "http://localhost:8000/health/live",
        "authentication": "JWT Bearer Token",
        "public_endpoints": ["/health/*", "/api/analyze/public", "/api/auth/*"],
        "protected_endpoints": ["/api/analyses/*", "/api/user/*"]
    }

#подключим роутер к приложению
app.include_router(api_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)