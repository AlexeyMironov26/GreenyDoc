import React, { useCallback } from 'react';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

export function FileUploadZone({ onFileSelect, selectedFile }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && isValidFileType(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const isValidFileType = (file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    return validTypes.includes(file.type);
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all ${
        isDragging 
          ? 'border-white bg-white/10' 
          : 'border-white/50 hover:border-white/70'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {!selectedFile ? (
        <div className="flex flex-col items-center gap-4">
          <svg className="w-16 h-16 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-white/90">
            Перетащите изображение сюда
          </p>
        </div>
      ) : (
        <div className="text-white/90">
          <p>Файл загружен: {selectedFile.name}</p>
        </div>
      )}
    </div>
  );
}
