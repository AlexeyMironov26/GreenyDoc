import React, { useState } from 'react';
import { FileUploadZone } from './FileUploadZone';
import { AnalysisResult, AnalysisData } from './AnalysisResult';

interface HomePageProps {
  username?: string;
}

export function HomePage({ username }: HomePageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisData | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setAnalysisResult(null);
  };

  const handleFileInputClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    };
    input.click();
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);

    // Simulate AI analysis with delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock analysis results - randomly choose between different outcomes
    const random = Math.random();
    let result: AnalysisData;

    if (random < 0.5) {
      // Disease detected
      const diseases = [
        'Мучнистая роса',
        'Бактериальная пятнистость',
        'Фитофтороз',
        'Ржавчина листьев',
        'Антракноз'
      ];
      result = {
        type: 'disease',
        diseaseName: diseases[Math.floor(Math.random() * diseases.length)]
      };
    } else if (random < 0.7) {
      // Healthy plant
      result = {
        type: 'healthy'
      };
    } else {
      // No leaves detected
      result = {
        type: 'no-leaves'
      };
    }

    setAnalysisResult(result);
    setIsAnalyzing(false);

    // Save to history if user is logged in
    if (username && imageUrl) {
      const historyKey = `history_${username}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      
      history.unshift({
        id: Date.now().toString(),
        imageUrl: imageUrl,
        result: result,
        date: new Date().toISOString()
      });

      // Keep only last 50 items
      if (history.length > 50) {
        history.pop();
      }

      localStorage.setItem(historyKey, JSON.stringify(history));
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImageUrl('');
    setAnalysisResult(null);
    setIsAnalyzing(false);
  };

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div 
        className="w-full max-w-2xl rounded-2xl p-8 shadow-2xl"
        style={{
          background: 'linear-gradient(to bottom, #4ade80, #16a34a)'
        }}
      >
        {!analysisResult ? (
          <div className="space-y-6">
            {/* Upload zone or selected image preview */}
            {!imageUrl ? (
              <FileUploadZone 
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
              />
            ) : (
              <div className="rounded-lg overflow-hidden bg-white/10">
                <img 
                  src={imageUrl} 
                  alt="Selected plant leaf" 
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>
            )}

            {/* File info and buttons */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleFileInputClick}
                  className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 px-4 py-2 rounded-md transition-colors"
                >
                  Выбрать файл
                </button>
                <span className="text-white/80 text-sm">
                  Форматы: JPEG, JPG, PNG
                </span>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!selectedFile || isAnalyzing}
                className="bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-md transition-colors"
              >
                {isAnalyzing ? 'Анализ...' : 'Анализировать'}
              </button>
            </div>
          </div>
        ) : (
          <AnalysisResult 
            result={analysisResult}
            imageUrl={imageUrl}
            onReset={handleReset}
          />
        )}
      </div>
    </main>
  );
}
