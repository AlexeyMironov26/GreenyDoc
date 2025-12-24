import React, { useState } from 'react';
import { FileUploadZone } from './FileUploadZone';
import { AnalysisResult, AnalysisData } from './AnalysisResult';

interface HomePageProps {
  username?: string;
  authToken?: string;
}

const API_URL = 'http://localhost:8000';

export function HomePage({ username, authToken }: HomePageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setAnalysisResult(null);
    setError('');
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
    setError('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const headers: HeadersInit = {};
if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
}

const response = await fetch(`${API_URL}/api/analyses`, {
    method: 'POST',
    headers: headers, // Токен добавляется только если есть
    body: formData
});

      const data = await response.json();

      if (response.ok) {
        let result: AnalysisData;
        
        if (data.analysis_result?.status === 'disease_found') {
          result = {
            type: 'disease',
            diseaseName: data.analysis_result.disease_name
          };
        } else if (data.analysis_result?.status === 'no_disease') {
          result = {
            type: 'healthy'
          };
        } else if (data.analysis_result?.status === 'no_leaves') {
          result = {
            type: 'no-leaves'
          };
        } else {
          // Fallback для моковых данных или ошибок
          const random = Math.random();
          if (random < 0.5) {
            const diseases = ['Мучнистая роса', 'Бактериальная пятнистость', 'Фитофтороз', 'Ржавчина листьев', 'Антракноз'];
            result = {
              type: 'disease',
              diseaseName: diseases[Math.floor(Math.random() * diseases.length)]
            };
          } else if (random < 0.7) {
            result = { type: 'healthy' };
          } else {
            result = { type: 'no-leaves' };
          }
        }

        setAnalysisResult(result);
      } else {
        setError(data.detail || 'Ошибка анализа изображения');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImageUrl('');
    setAnalysisResult(null);
    setError('');
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
        {error && (
          <div className="mb-4 border-2 border-red-600 bg-white rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
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
                  disabled={isAnalyzing}
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