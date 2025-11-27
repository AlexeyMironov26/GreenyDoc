import React, { useState, useEffect } from 'react';
import { LoginPage } from '../components/LoginPage';
import { HomePage } from '../components/HomePage';
import { HistoryPage } from '../components/HistoryPage';
import { SettingsPage } from '../components/SettingsPage';
import { UserMenu } from '../components/UserMenu';

const backgroundImage = './images/background.png'

type Page = 'home' | 'login' | 'history' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(savedUser);
    }
  }, []);

  const handleLogin = (username: string) => {
    setCurrentUser(username);
    localStorage.setItem('currentUser', username);
    setCurrentPage('home');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setCurrentPage('home');
  };

  const handleDeleteAccount = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setCurrentPage('home');
  };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
  };

  return (
    
    <div 
      className="min-h-screen relative flex flex-col"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header - only show on non-login pages */}
        {currentPage !== 'login' && (
          <header className="p-6 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage('home')}
              className="cursor-pointer"
            >
              <h1 
                className="text-white text-4xl"
                style={{
                  textShadow: '0 0 3px #22c55e, 0 0 6px #22c55e, 0 0 9px #22c55e'
                }}
              >
                GreenyDoc
              </h1>
            </button>
            
            {currentUser ? (
              <UserMenu
                username={currentUser}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
              />
            ) : (
              <button
                onClick={() => setCurrentPage('login')}
                className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Войти
              </button>
            )}
          </header>
        )}

        {/* Page content */}
        {currentPage === 'login' && (
          <LoginPage
            onLogin={handleLogin}
            onBack={() => setCurrentPage('home')}
          />
        )}

        {currentPage === 'home' && (
          <HomePage username={currentUser || undefined} />
        )}

        {currentPage === 'history' && currentUser && (
          <HistoryPage username={currentUser} />
        )}

        {currentPage === 'settings' && currentUser && (
          <SettingsPage
            username={currentUser}
            onDeleteAccount={handleDeleteAccount}
          />
        )}
      </div>
    </div>
  );
}
