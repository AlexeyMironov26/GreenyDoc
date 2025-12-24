import React, { useEffect, useState } from 'react';

interface HistoryItem {
  id: string;
  image_url: string;
  disease_name?: string;
  status: string;
  created_at: string;
  diagnosis?: string;
}

interface HistoryPageProps {
  username: string;
  authToken: string;
}

const API_URL = 'http://localhost:8000';

export function HistoryPage({ username, authToken }: HistoryPageProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      setError('');

      if (!authToken) {
        setError('Требуется авторизация для просмотра истории');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Loading history for user:', username);
        console.log('Using token:', authToken.substring(0, 20) + '...');
        
        const response = await fetch(`${API_URL}/api/analyses/my`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Токен недействителен или истек');
          }
          if (response.status === 404) {
            throw new Error('Эндпоинт не найден. Проверьте URL.');
          }
          throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        console.log('Raw API response:', data);

        // Проверяем, что data - массив
        if (!Array.isArray(data)) {
          console.error('Data is not an array:', data);
          throw new Error('Некорректный формат данных от сервера');
        }

        if (data.length === 0) {
          console.log('No analyses found for user');
          setHistory([]);
          setError('');
        } else {
          // Преобразуем данные из API в формат для фронтенда
          const formattedHistory = data.map((item: any) => {
            console.log('Processing item:', item);
            
            // Формируем URL изображения
            let imageUrl = '';
            
            if (item.image_url) {
              // Если URL начинается с /, добавляем базовый URL
              imageUrl = item.image_url.startsWith('/') 
                ? `${API_URL}${item.image_url}`
                : item.image_url;
            } else {
              // Заглушка для изображения
              imageUrl = 'https://via.placeholder.com/300x200/4ade80/ffffff?text=Изображение';
            }

            // Определяем статус на основе disease_name
            let status = item.status || 'unknown';
            if (!status && item.disease_name) {
              if (item.disease_name.includes('здорово') || item.disease_name.includes('здоров')) {
                status = 'no_disease';
              } else if (item.disease_name.includes('болезн') || item.disease_name.includes('заболеван')) {
                status = 'disease_found';
              }
            }

            return {
              id: item.id?.toString() || Date.now().toString(),
              image_url: imageUrl,
              disease_name: item.disease_name || 'Диагноз не указан',
              status: status,
              created_at: item.created_at || new Date().toISOString(),
              diagnosis: item.diagnosis || item.disease_name?.split(':')[1]?.trim() || 'Растение не определено'
            };
          });

          console.log('Formatted history:', formattedHistory);
          setHistory(formattedHistory);
          setError('');
          
          // Сохраняем в localStorage для оффлайн-доступа
          localStorage.setItem(`history_${username}`, JSON.stringify(formattedHistory));
        }

      } catch (error: any) {
        console.error('Error loading history:', error);
        setError(`Ошибка загрузки истории: ${error.message}`);
        
        // Fallback: пробуем получить историю из localStorage
        try {
          const savedHistory = localStorage.getItem(`history_${username}`);
          if (savedHistory) {
            const parsedHistory = JSON.parse(savedHistory);
            if (Array.isArray(parsedHistory)) {
              setHistory(parsedHistory);
              setError('Загружена история из кэша. API недоступен.');
            }
          }
        } catch (localStorageError) {
          console.error('LocalStorage error:', localStorageError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [username, authToken]);

  // Функция форматирования даты с обработкой ошибок
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      // Пробуем разные форматы дат
      try {
        // Если дата в формате SQLite (YYYY-MM-DD HH:MM:SS)
        if (dateString.includes(' ')) {
          const [datePart, timePart] = dateString.split(' ');
          const [year, month, day] = datePart.split('-').map(Number);
          const [hour, minute, second] = timePart.split(':').map(Number);
          const date = new Date(year, month - 1, day, hour, minute, second);
          return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      } catch (e2) {
        console.log('Could not parse date:', dateString);
        return 'Дата не определена';
      }
      return 'Дата не определена';
    }
  };

  // Определяем, что показывать на основе статуса
  const getStatusDisplay = (item: HistoryItem) => {
    switch (item.status) {
      case 'disease_found':
        return (
          <div className="space-y-2">
            <p className="text-white/80 text-sm">Обнаружено заболевание:</p>
            <p className="text-white font-semibold">{item.disease_name}</p>
            {item.diagnosis && (
              <p className="text-white/90 text-sm">Растение: {item.diagnosis}</p>
            )}
          </div>
        );
      case 'no_disease':
        return (
          <div className="space-y-2">
            <p className="text-white/80 text-sm">Результат анализа:</p>
            <p className="text-white">✅ {item.disease_name || 'Растение здорово!'}</p>
            {item.diagnosis && (
              <p className="text-white/90 text-sm">Растение: {item.diagnosis}</p>
            )}
          </div>
        );
      case 'no_leaves':
        return (
          <p className="text-white">
            ⚠️ На фото не обнаружены листья растений
          </p>
        );
      default:
        return (
          <div>
            <p className="text-white/80 text-sm">Статус: {item.status}</p>
            {item.disease_name && (
              <p className="text-white mt-1">{item.disease_name}</p>
            )}
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl rounded-2xl p-8 shadow-2xl bg-gradient-to-b from-emerald-400 to-emerald-600">
          <p className="text-white text-center text-xl">Загрузка истории анализов...</p>
          <p className="text-white/80 text-center text-sm mt-2">Пожалуйста, подождите</p>
        </div>
      </main>
    );
  }

  if (error && history.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl rounded-2xl p-8 shadow-2xl bg-gradient-to-b from-amber-500 to-amber-700">
          <p className="text-white text-center text-xl mb-4">⚠️ {error}</p>
          <p className="text-white/80 text-center text-sm">
            Проверьте:
            <br />1. Запущен ли бэкенд на localhost:8000
            <br />2. Авторизованы ли вы в системе
            <br />3. Откройте консоль браузера (F12) для деталей
          </p>
        </div>
      </main>
    );
  }

  if (history.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl rounded-2xl p-8 shadow-2xl bg-gradient-to-b from-emerald-400 to-emerald-600">
          <p className="text-white text-center text-xl">
            История анализов пуста
          </p>
          <p className="text-white/80 text-center text-sm mt-2">
            Выполните анализ растений, чтобы увидеть их здесь
          </p>
          <div className="mt-4 p-4 bg-white/10 rounded-lg">
            <p className="text-white/70 text-sm">
              Для отладки:
              <br />1. Убедитесь, что вы авторизованы
              <br />2. Проверьте консоль браузера (F12)
              <br />3. Попробуйте проанализировать новое изображение
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-white text-3xl mb-6">История анализов</h2>
        
        {/* Информация о загруженных данных (для отладки) */}
        <div className="mb-6 p-4 bg-white/10 rounded-lg">
          <p className="text-white/80 text-sm">
            Загружено анализов: <span className="text-emerald-300 font-semibold">{history.length}</span>
          </p>
          <p className="text-white/60 text-xs">
            Пользователь: {username}
          </p>
          {error && (
            <p className="text-amber-300 text-sm mt-1">
              Примечание: {error}
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((item) => (
            <div
              key={item.id}
              className="rounded-xl overflow-hidden shadow-xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="relative h-48 bg-white/10">
                <img
                  src={item.image_url}
                  alt={`Анализ растения ${item.diagnosis || ''}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/300x200/4ade80/ffffff?text=Изображение+не+доступно';
                    target.className = 'w-full h-full object-contain p-4';
                  }}
                />
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {item.status === 'disease_found' ? '⚠️ Болезнь' : 
                   item.status === 'no_disease' ? '✅ Здорово' : '❓ Неизвестно'}
                </div>
              </div>
              
              <div className="p-4">
                <div className="border-2 border-white/30 rounded-lg p-3 bg-white/10 backdrop-blur-sm">
                  {getStatusDisplay(item)}
                </div>
                
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/20">
                  <p className="text-white/70 text-xs">
                    {formatDate(item.created_at)}
                  </p>
                  <div className="flex gap-2">
                    <button className="text-blue-300 hover:text-blue-200 text-xs underline transition-colors">
                      Подробнее
                    </button>
                    <button className="text-emerald-300 hover:text-emerald-200 text-xs underline transition-colors">
                      Лечение
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}