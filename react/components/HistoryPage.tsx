import React from 'react';
import { AnalysisData } from './AnalysisResult';

interface HistoryItem {
  id: string;
  imageUrl: string;
  result: AnalysisData;
  date: string;
}

interface HistoryPageProps {
  username: string;
}

export function HistoryPage({ username }: HistoryPageProps) {
  const [history, setHistory] = React.useState<HistoryItem[]>([]);

  React.useEffect(() => {
    // Load history from localStorage
    const historyKey = `history_${username}`;
    const savedHistory = localStorage.getItem(historyKey);
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, [username]);

  if (history.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div 
          className="w-full max-w-2xl rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'linear-gradient(to bottom, #4ade80, #16a34a)'
          }}
        >
          <p className="text-white text-center text-xl">
            История анализов пуста. Начните анализировать растения!
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-white text-3xl mb-6">История анализов</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((item) => (
            <div
              key={item.id}
              className="rounded-xl overflow-hidden shadow-xl"
              style={{
                background: 'linear-gradient(to bottom, #4ade80, #16a34a)'
              }}
            >
              <div className="relative h-48 bg-white/10">
                <img
                  src={item.imageUrl}
                  alt="Plant analysis"
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="p-4">
                <div className="border-2 border-white/50 rounded-lg p-3 bg-white/5">
                  {item.result.type === 'disease' && (
                    <div className="space-y-2">
                      <p className="text-white/80 text-sm">Обнаружено заболевание:</p>
                      <p className="text-white">{item.result.diseaseName}</p>
                      <div className="flex gap-2 flex-wrap text-sm">
                        <a href="#" className="text-blue-300 hover:text-blue-200 underline">
                          Справочная информация
                        </a>
                        <a href="#" className="text-blue-300 hover:text-blue-200 underline">
                          Лечение
                        </a>
                      </div>
                    </div>
                  )}
                  {item.result.type === 'healthy' && (
                    <p className="text-white text-sm">
                      Заболеваний не выявлено. Растение здорово! 🌿
                    </p>
                  )}
                  {item.result.type === 'no-leaves' && (
                    <p className="text-white text-sm">
                      Листья не обнаружены
                    </p>
                  )}
                </div>
                
                <p className="text-white/70 text-sm mt-2">
                  {new Date(item.date).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
