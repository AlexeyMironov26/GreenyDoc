from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
#import os
import uvicorn

#импорт нейросети
#from neuro_network.model import analyze_image

app = FastAPI(title="GreenyDoc", version="1.0.0")

# СОЗДАЕМ РОУТЕР ПРЯМО ЗДЕСЬ В ЭТОМ ЖЕ ФАЙЛЕ
api_router = APIRouter()

#Монтирование статических файлов
# app.mount("/", StaticFiles(directory="react-build", html=True), name="spa") 
#нужно будет сделать без этой строчки в файле фастапи, реакт приложение у нас будет отдельным и 
# подключаться к фастапи серверу, но в фастапи сервере может не быть никакого упоминания реакт приложения

#нужно прописать не отдельные эндпойнты app.method_name, а соединить их все роутером

#База данных с пользователями
fake_users_db = {}

#Модели данных
class UserRegister(BaseModel): #наследуем от бэйсмодел, чтобы парсинг параметров из пришедшего запроса в 
    #данную структуру проводился автоматически, а также автоматически осуществлялась проверка типов данных из 
    #параметров запроса на соответствие типам из класса, наследующего бэйсмодел. Также, если класс наследует бэйсмодел,
    #то фастапи умеет работать с ним как с объектом, т е парсить параметры из запроса в него, сериализовать их 
    # из него в json/dict и т д
    username: str
    password: str
    confirm_password: str

class UserLogin(BaseModel):
    username: str
    password: str

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

# ТЕПЕРЬ ВСЕ ЭНДПОЙНТЫ РЕГИСТРИРУЕМ ЧЕРЕЗ РОУТЕР (api_router) вместо app

#health check
@api_router.get("/health/live", response_model=HealthResponse)
def liveness_probe():
    #Проверяем, что сервер на данный момент работает
    #возвращаем не словарь, а экземпляр Pydantic модели
    return HealthResponse(status="ALIVE", service="GreenyDoc")

@api_router.get("/health/ready", response_model=ReadyResponse)
def ready_check():
    #проверка готовности сервиса
    #можно также добавить проверки подключения к базе данных и другим сервисам
    try:
        #проверка нейросети
        # test_result = analyze_image("test")  # закомментировано пока нет нейросети
        
        #возвращаем экземпляр Pydantic модели вместо словаря
        return ReadyResponse(
            status="READY", 
            service="GreenyDoc",
            neural_network="AVAILABLE"
        )
    except Exception as e:
        #для ошибок тоже возвращаем Pydantic модель, но через JSONResponse так как нужен кастомный статус код
        error_response = ReadyResponse(
            status="NOT_READY",
            service="GreenyDoc", 
            error=str(e)
        )
        return JSONResponse(
            status_code=503,
            content=error_response.dict()  # преобразуем модель в dict для JSONResponse
        )

# @app.get("/", response_class=HTMLResponse)
# async def serve_spa(request: Request):
#     #Отдаёт React SPA (single page architecture) при первом гет запросе от браузера
#     return templates.TemplateResponse("index.html", {"request": request})

@api_router.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_plant_image(file: UploadFile = File(...)):
    #Анализ изображения растения через нейронку
    try:
        #обработка файла
        image_data = await file.read()
        
        #Вызов нейросети
        #result = analyze_image(image_data)
        
        #возвращаем экземпляр Pydantic модели вместо словаря
        return AnalysisResponse(
            success=True,
            analysis_result=AnalysisResult(
                status="no_disease",  # заглушка
                disease_name="Тестовый диагноз",
                reference_link="https://example.com",
                treatment_link="https://example.com/treatment"
            )
        )
    except Exception as e:
        #возвращаем экземпляр Pydantic модели для ошибки
        return AnalysisResponse(
            success=False,
            error=str(e)
        )

@api_router.post("/api/auth/register", response_model=AuthResponse)
async def register_user(user_data: UserRegister):
    #Регистрация нового пользователя
    if user_data.password != user_data.confirm_password:
        raise HTTPException(status_code=400, detail="Пароли не совпадают")
    
    if user_data.username in fake_users_db:
        raise HTTPException(status_code=400, detail="Пользователь уже существует")
    
    #запись данных нового зарегестрированного пользователя  базу данных
    fake_users_db[user_data.username] = {
        "username": user_data.username,
        "password": user_data.password #В будущем здесь будет хэширование пароля
    }
    
    #возвращаем экземпляр Pydantic модели вместо словаря
    return AuthResponse(success=True, message="Пользователь зарегистрирован")

@api_router.post("/api/auth/login", response_model=AuthResponse)
async def login_user(user_data: UserLogin):
    #Вход пользователя
    user = fake_users_db.get(user_data.username)
    
    if not user or user["password"] != user_data.password:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    
    #возвращаем экземпляр Pydantic модели вместо словаря
    return AuthResponse(
        success=True, 
        username=user_data.username
    )

@api_router.get("/api/history", response_model=HistoryResponse)
async def get_user_history():
    #Получение истории анализов пользователя
    #тут будет запрос к базе данных для получения истории анализов пользователя
    
    #возвращаем экземпляр Pydantic модели вместо словаря
    return HistoryResponse(
        success=True,
        history=[
            HistoryItem(
                id=1,
                image_url="/some/url/sample1.jpg",
                date="2025-11-15",
                diagnosis="Мучнистая роса",
                result="disease_found"
            )
        ]
    )

@api_router.post("/api/user/change-password", response_model=MessageResponse)
async def change_password():
    #Смена пароля пользователя: запрос к бд, изменение там пароля конкретного пользователя
    #возвращаем экземпляр Pydantic модели вместо словаря
    return MessageResponse(success=True, message="Пароль изменен")

@api_router.post("/api/user/delete-account", response_model=MessageResponse)
async def delete_account():
    #Удаление аккаунта пользователя: также запрос к бд
    #возвращаем экземпляр Pydantic модели вместо словаря
    return MessageResponse(success=True, message="Аккаунт удален")

@api_router.post("/api/auth/logout", response_model=AuthResponse)
async def logout_user():
    #Выход пользователя
    #возвращаем экземпляр Pydantic модели вместо словаря
    return AuthResponse(success=True, message="Выход выполнен")

# Корневой эндпоинт для проверки работы сервера (оставляем через app)
@app.get("/")
async def root():
    #для корневого эндпоинта тоже можно создать Pydantic модель, но пока оставим как есть
    return {
        "message": "GreenyDoc API Server is running", 
        "docs": "http://localhost:8000/docs",
        "health_check": "http://localhost:8000/health/live"
    }

# ВАЖНО: ПОДКЛЮЧАЕМ РОУТЕР К ПРИЛОЖЕНИЮ
app.include_router(api_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
#для перехода на страницу сваггера использовать ссылку во время работы сервера http://localhost:8000/docs 