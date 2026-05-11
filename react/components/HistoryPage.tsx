import React from 'react';
import { useApi } from './hooks/useApi';
import { useAnalysisHistory } from './hooks/useAnalysisHistory';
import { HistoryFilters } from './HistoryFilters';
import { Pagination } from './Pagination';
import { SEO } from './SEO';
import { useState, useRef, useEffect } from 'react';

const API_URL = 'http://localhost:8000';

const LazyImage = ({ src, alt }: { src: string; alt: string }) => {
  const [imageSrc, setImageSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px' } // начнёт загружаться за 100px до появления в поле зрения
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'https://via.placeholder.com/300x200/10b981/ffffff?text=Нет+изображения';
  };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className="w-full h-full object-cover"
      onError={handleError}
    />
  );
};

export function HistoryPage() {
    const { apiRequest } = useApi();
    const { data, loading, pagination, filters, updateFilter } = useAnalysisHistory(apiRequest);

    const downloadFile = async (imageUrl: string, filename: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Не удалось скачать файл');
        }
    };

    if (loading) {
        return (
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="text-white text-xl">Загрузка истории...</div>
            </main>
        );
    }

    return (
      <>
    <SEO 
      title="История анализов"
      description="Все ваши анализы растений в одном месте. История диагнозов и рекомендаций по лечению."
      canonical="http://localhost:5173/history"
    />
        <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-white text-4xl mb-6">История анализов растений</h1>
                <h2 className="text-white/80 text-sm mb-4">Все ваши AI-диагностики в одном месте</h2>
                <h3 className="text-white/60 text-xs">Результаты анализов</h3>
                
                <HistoryFilters filters={filters} onFilterChange={updateFilter} />
                
                {data.length === 0 ? (
                    <div 
                        className="rounded-xl p-8 text-center"
                        style={{ background: 'linear-gradient(to bottom, #10b981, #059669)' }}
                    >
                        <p className="text-white text-xl">История анализов пуста</p>
                        <p className="text-white/80 text-sm mt-2">
                            Выполните анализ растений, чтобы увидеть их здесь
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <p className="text-white/80 text-sm">
                                Найдено анализов: <span className="text-emerald-300 font-semibold">{pagination.total}</span>
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {data.map((item: any) => (
                                <div
                                    key={item.id}
                                    className="rounded-xl overflow-hidden shadow-xl hover:scale-[1.02] transition-all duration-300"
                                    style={{ background: 'linear-gradient(to bottom, #10b981, #059669)' }}
                                >
                                    <div className="relative h-48" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                        {item.image_url && (
                                            <LazyImage 
                                              src={item.image_url} 
                                              alt={`Анализ растения: ${item.diagnosis}. Результат: ${item.disease_name || 'здоров'}`}
                                              />
                                        )}
                                        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                            {item.status === 'disease_found' ? '⚠️ Болезнь' : '✅ Здорово'}
                                        </div>
                                    </div>
                                    
                                    <div className="p-4">
                                        <div className="border-2 border-white/30 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                            {item.status === 'disease_found' ? (
                                                <div className="space-y-2">
                                                    <p className="text-white/80 text-sm">Обнаружено заболевание:</p>
                                                    <p className="text-white font-semibold">{item.disease_name}</p>
                                                    {item.diagnosis && (
                                                        <p className="text-white/90 text-sm">Растение: {item.diagnosis}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-white/80 text-sm">Результат анализа:</p>
                                                    <p className="text-white">✅ {item.disease_name || 'Растение здорово!'}</p>
                                                    {item.diagnosis && (
                                                        <p className="text-white/90 text-sm">Растение: {item.diagnosis}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/20">
                                            <p className="text-white/70 text-xs">
                                                {new Date(item.created_at).toLocaleDateString('ru-RU', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                            {item.image_url && (
                                                <button
                                                    onClick={() => downloadFile(item.image_url, `analysis_${item.id}.jpg`)}
                                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
                                                >
                                                    📥 Скачать
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <Pagination
                            page={pagination.page}
                            totalPages={pagination.pages}
                            onPageChange={(page) => updateFilter('page', page)}
                        />
                    </>
                )}
            </div>
        </main>
      </>
    );
}