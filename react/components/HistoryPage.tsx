import React from 'react';
import { useApi } from './hooks/useApi';
import { useAnalysisHistory } from './hooks/useAnalysisHistory';
import { HistoryFilters } from './HistoryFilters';
import { Pagination } from './Pagination';
import { SEO } from './SEO';

const API_URL = 'http://localhost:8000';

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
                <h2 className="text-white text-3xl mb-6">История анализов</h2>
                
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
                                            <img
                                                src={item.image_url}
                                                loading="lazy"
                                                alt={`Анализ растения: ${item.diagnosis}. Результат: ${item.disease_name || 'здоров'}`}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 
                                                        'https://via.placeholder.com/300x200/10b981/ffffff?text=Нет+изображения';
                                                }}
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































//old version
// import React, { useEffect, useState } from 'react';
// import { useApi } from './hooks/useApi';

// interface HistoryItem {
//   id: string;
//   image_url: string;
//   disease_name?: string;
//   status: string;
//   created_at: string;
//   diagnosis?: string;
// }

// interface HistoryPageProps {
//   username: string;
// }

// const API_URL = 'http://localhost:8000';

// export function HistoryPage({ username }: HistoryPageProps) {
//   const [history, setHistory] = useState<HistoryItem[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState('');
//   const { apiRequest } = useApi();
  
//   useEffect(() => {
//     const loadHistory = async () => {
//       setIsLoading(true);
//       setError('');
//       const refreshToken = localStorage.getItem('refreshToken');
      
//       if (!refreshToken) {  
//     setError('Требуется авторизация для просмотра истории');
//     setIsLoading(false);
//     return;
//   }
  
//       try {
//         const response = await apiRequest('/api/analyses/my');

//         if (!response.ok) {
//           throw new Error(`Ошибка ${response.status}`);
//         }

//         const data = await response.json();

//         if (!Array.isArray(data)) {
//           throw new Error('Некорректный формат данных от сервера');
//         }

//         const formattedHistory = data.map((item: any) => {
//           let imageUrl = '';
          
//           if (item.image_url) {
//             imageUrl = item.image_url.startsWith('/') 
//               ? `${API_URL}${item.image_url}`
//               : item.image_url;
//           } else {
//             imageUrl = 'https://via.placeholder.com/300x200/10b981/ffffff?text=Изображение';
//           }

//           return {
//             id: item.id?.toString() || Date.now().toString(),
//             image_url: imageUrl,
//             disease_name: item.disease_name || 'Диагноз не указан',
//             status: item.status || 'unknown',
//             created_at: item.created_at || new Date().toISOString(),
//             diagnosis: item.diagnosis || 'Растение не определено'
//           };
//         });

//         setHistory(formattedHistory);
//         setError('');

//       } catch (error: any) {
//         console.error('Error loading history:', error);
//         setError(`Ошибка загрузки истории: ${error.message}`);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     loadHistory();
//   }, []);

//   const formatDate = (dateString: string) => {
//     try {
//       const date = new Date(dateString);
//       return date.toLocaleDateString('ru-RU', {
//         day: 'numeric',
//         month: 'long',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit'
//       });
//     } catch (e) {
//       return 'Дата не определена';
//     }
//   };

//   const getStatusDisplay = (item: HistoryItem) => {
//     switch (item.status) {
//       case 'disease_found':
//         return (
//           <div className="space-y-2">
//             <p className="text-white/80 text-sm">Обнаружено заболевание:</p>
//             <p className="text-white font-semibold">{item.disease_name}</p>
//             {item.diagnosis && (
//               <p className="text-white/90 text-sm">Растение: {item.diagnosis}</p>
//             )}
//           </div>
//         );
//       case 'no_disease':
//         return (
//           <div className="space-y-2">
//             <p className="text-white/80 text-sm">Результат анализа:</p>
//             <p className="text-white">✅ {item.disease_name || 'Растение здорово!'}</p>
//             {item.diagnosis && (
//               <p className="text-white/90 text-sm">Растение: {item.diagnosis}</p>
//             )}
//           </div>
//         );
//       default:
//         return (
//           <div>
//             <p className="text-white/80 text-sm">Статус: {item.status}</p>
//             {item.disease_name && (
//               <p className="text-white mt-1">{item.disease_name}</p>
//             )}
//           </div>
//         );
//     }
//   };

//   if (isLoading) {
//     return (
//       <main className="flex-1 flex items-center justify-center p-6">
//         <div 
//           className="w-full max-w-2xl rounded-2xl p-8 shadow-2xl"
//           style={{
//             background: 'linear-gradient(to bottom, #10b981, #059669)'
//           }}
//         >
//           <p className="text-white text-center text-xl">Загрузка истории анализов...</p>
//           <p className="text-white/80 text-center text-sm mt-2">Пожалуйста, подождите</p>
//         </div>
//       </main>
//     );
//   }

//   if (error && history.length === 0) {
//     return (
//       <main className="flex-1 flex items-center justify-center p-6">
//         <div 
//           className="w-full max-w-2xl rounded-2xl p-8 shadow-2xl"
//           style={{
//             background: 'linear-gradient(to bottom, #f59e0b, #d97706)'
//           }}
//         >
//           <p className="text-white text-center text-xl mb-4">⚠️ {error}</p>
//         </div>
//       </main>
//     );
//   }

//   if (history.length === 0) {
//     return (
//       <main className="flex-1 flex items-center justify-center p-6">
//         <div 
//           className="w-full max-w-2xl rounded-2xl p-8 shadow-2xl"
//           style={{
//             background: 'linear-gradient(to bottom, #10b981, #059669)'
//           }}
//         >
//           <p className="text-white text-center text-xl">
//             История анализов пуста
//           </p>
//           <p className="text-white/80 text-center text-sm mt-2">
//             Выполните анализ растений, чтобы увидеть их здесь
//           </p>
//         </div>
//       </main>
//     );
//   }

//   return (
//     <main className="flex-1 p-6 overflow-y-auto">
//       <div className="max-w-6xl mx-auto">
//         <h2 className="text-white text-3xl mb-6">История анализов</h2>
        
//         <div className="mb-6 p-4 rounded-lg" style={{background: 'rgba(255,255,255,0.1)'}}>
//           <p className="text-white/80 text-sm">
//             Загружено анализов: <span className="text-emerald-300 font-semibold">{history.length}</span>
//           </p>
//         </div>
        
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {history.map((item) => (
//             <div
//               key={item.id}
//               className="rounded-xl overflow-hidden shadow-xl hover:scale-[1.02] transition-all duration-300"
//               style={{
//                 background: 'linear-gradient(to bottom, #10b981, #059669)'
//               }}
//             >
//               <div className="relative h-48" style={{background: 'rgba(255,255,255,0.1)'}}>
//                 <img
//                   src={item.image_url}
//                   alt={`Анализ растения ${item.diagnosis || ''}`}
//                   className="w-full h-full object-cover"
//                   onError={(e) => {
//                     const target = e.target as HTMLImageElement;
//                     target.src = 'https://via.placeholder.com/300x200/10b981/ffffff?text=Изображение+растения';
//                     target.className = 'w-full h-full object-contain p-4';
//                   }}
//                 />
//                 <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
//                   {item.status === 'disease_found' ? '⚠️ Болезнь' : '✅ Здорово'}
//                 </div>
//               </div>
              
//               <div className="p-4">
//                 <div className="border-2 border-white/30 rounded-lg p-3" style={{background: 'rgba(255,255,255,0.1)'}}>
//                   {getStatusDisplay(item)}
//                 </div>
                
//                 <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/20">
//                   <p className="text-white/70 text-xs">
//                     {formatDate(item.created_at)}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     </main>
//   );
// }