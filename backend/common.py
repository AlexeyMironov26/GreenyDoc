import sqlite3 
from contextlib import contextmanager
from protctd_keys import secretKey, api_key
import hashlib
import secrets
from fastapi import HTTPException
from dotenv import load_dotenv
import base64
import requests

PLANT_ID_API_KEY = api_key  
PLANT_ID_API_URL = "https://plant.id/api/v3/health_assessment"

load_dotenv() 
ALLOWED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png"]
MAX_FILE_SIZE = 10 * 1024 * 1024 

def analyze_plant_disease(image_bytes: bytes) -> dict:
    """
    Анализирует изображение растения на наличие болезней
    через Plant.id API
    """
    # return {"error": "Тестовый режим: API отключен для экономии токенов"}
    # print("Тестовый режим: API отключен для экономии токенов")
    try:
        # Кодируем изображение в base64
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        encoded_image = f"data:image/jpeg;base64,{base64_image}"
        # ФОРМАТ ЗАПРОСА ДЛЯ V3 (согласно документации)
        payload = {
            "images": [encoded_image],
            "health": "only"
        }

        params = {
            "details": "cause,treatment,description",
            "language": "ru"
        }

        headers = {
            "Content-Type": "application/json",
            "Api-Key": PLANT_ID_API_KEY
        }
        
        response = requests.post(PLANT_ID_API_URL,
         json=payload,
        params=params,
        headers=headers,
        timeout=10)
        print(f"Статус-код: {response.status_code}")
        #ВАЖНО: Выводим полный ответ сервера, чтобы понять причину ошибки
        print(f"Тело ответа: {response.text}")

        response.raise_for_status()
        
        result = response.json()
        
        # ПАРСИНГ ОТВЕТА ДЛЯ V3 (согласно документации)
        # Путь к данным о болезнях: result["result"]["disease"]["suggestions"]
        disease_data = result.get("result", {}).get("disease", {})
        suggestions = disease_data.get("suggestions", [])
        
        if suggestions:
            disease = suggestions[0]
            probability = disease.get("probability", 0)
            
            # Если вероятность болезни < 50%, считаем растение здоровым
            is_healthy = probability < 0.5
            
            diseases = []
            if not is_healthy:
                disease_details = disease.get("disease_details", {})
                diseases.append({
                    "name": disease.get("name", "Неизвестная болезнь"),
                    "probability": probability,
                    "cause": disease_details.get("cause", ""),
                    "treatment": disease_details.get("treatment", {}).get("description", "") if isinstance(disease_details.get("treatment"), dict) else disease_details.get("treatment", "")
                })
            
            return {
                "plant_name": "Растение определено",  # В v3 нет названия растения в этом ответе
                "probability": probability,
                "is_healthy": is_healthy,
                "diseases": diseases,
                "similar_images": result.get("result", {}).get("similar_images", [])[:3] if result.get("result") else []
            }
        
        return {"error": "Не удалось определить растение"}
        
    except requests.exceptions.RequestException as e:
        return {"error": f"Ошибка API: {str(e)}"}
    except Exception as e:
        return {"error": f"Внутренняя ошибка: {str(e)}"}

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