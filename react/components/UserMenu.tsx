import React, { useEffect, useRef } from 'react';

interface UserMenuProps {
  username: string;
  role?: string;  
  onNavigate: (page: 'home' | 'history' | 'settings'| 'admin') => void;
  onLogout: () => void;
}

export function UserMenu({ username, role, onNavigate, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

console.log('🔥 role in UserMenu:', role);
console.log('🔥 сравнение:', role === 'admin');
  
return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        {username}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl py-2 z-50">
          <button
            onClick={() => handleMenuClick(() => onNavigate('home'))}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-800 transition-colors"
          >
            Главная страница
          </button>
          <button
            onClick={() => handleMenuClick(() => onNavigate('history'))}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-800 transition-colors"
          >
            История анализов
          </button>
          <button
            onClick={() => handleMenuClick(() => onNavigate('settings'))}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-800 transition-colors"
          >
            Настройки
          </button>

          {role === 'admin' && (
            <button
              onClick={() => handleMenuClick(() => onNavigate('admin'))}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-purple-600 font-semibold transition-colors"
            >
              ⚙️ Админ-панель
            </button>
          )}

          <hr className="my-2" />
          <button
            onClick={() => handleMenuClick(onLogout)}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 transition-colors"
          >
            Выйти из аккаунта
          </button>
        </div>
      )}
    </div>
  );
}