import React from 'react';

export interface AnalysisData {
  type: 'disease' | 'no-leaves' | 'healthy';
  diseaseName?: string;
  imageUrl?: string;
  message?: string;
}

interface AnalysisResultProps {
  result: AnalysisData;
  imageUrl: string;
  onReset: () => void;
}

export function AnalysisResult({ result, imageUrl, onReset }: AnalysisResultProps) {
  return (
    <div className="w-full">
      {/* Image display */}
      <div className="relative rounded-lg overflow-hidden mb-6">
        <img 
          src={imageUrl} 
          alt="Analyzed plant leaf" 
          className="w-full h-auto max-h-96 object-contain bg-white/10"
        />
        {result.type === 'disease' && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Mock highlighting of damaged areas */}
            <div className="absolute top-1/4 left-1/3 w-20 h-20 border-4 border-red-500 rounded-full opacity-70"></div>
            <div className="absolute top-1/2 right-1/4 w-16 h-16 border-4 border-red-500 rounded-full opacity-70"></div>
          </div>
        )}
      </div>

      {/* Result info box with reset button */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 border-2 border-white/50 rounded-lg p-4 bg-white/5">
          {result.type === 'disease' && (
            <div className="space-y-3">
              <div>
                <p className="text-white/80 mb-2">Обнаружено заболевание:</p>
                <p className="text-white text-xl">{result.diseaseName}</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <a 
                  href="#" 
                  className="text-blue-300 hover:text-blue-200 underline"
                  onClick={(e) => e.preventDefault()}
                >
                  Справочная информация
                </a>
                <a 
                  href="#" 
                  className="text-blue-300 hover:text-blue-200 underline"
                  onClick={(e) => e.preventDefault()}
                >
                  Инструкции по лечению
                </a>
              </div>
            </div>
          )}
          {result.type === 'no-leaves' && (
            <p className="text-white/90">
              На изображении не обнаружены листья растений. Пожалуйста, загрузите фотографию листьев.
            </p>
          )}
          {result.type === 'healthy' && (
            <p className="text-white/90">
              Анализ завершен. Заболеваний не выявлено. Растение здорово! 🌿
            </p>
          )}
        </div>

        <button
          onClick={onReset}
          className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 shrink-0 p-2 rounded-md transition-colors"
          title="Провести анализ листьев ещё одного растения"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
