import React, { useState, useEffect } from 'react';
import { LoginPage } from '../components/LoginPage';
import { HomePage } from '../components/HomePage';
import { HistoryPage } from '../components/HistoryPage';
import { SettingsPage } from '../components/SettingsPage';
import { UserMenu } from '../components/UserMenu';

const backgroundImage = './images/background.png'
const API_URL = 'http://localhost:8000'; // FastAPI сервер

type Page = 'home' | 'login' | 'history' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentUser, setCurrentUser] = useState<{username: string, token: string, id: number} | null>(null);

  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('authToken');
    
    if (savedUser && savedToken) {
      try {
        const userData = JSON.parse(savedUser);
        setCurrentUser({
          username: userData.username,
          token: savedToken,
          id: userData.id
        });
      } catch (e) {
        console.error('Error parsing saved user:', e);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
      }
    }
  }, []);

  const handleLogin = async (username: string, token: string, userId: number) => {
    const userData = { username, token, id: userId };
    setCurrentUser(userData);
    localStorage.setItem('currentUser', JSON.stringify({ username, id: userId }));
    localStorage.setItem('authToken', token);
    setCurrentPage('home');
  };

  const handleLogout = async () => {
    if (currentUser?.token) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentUser.token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    setCurrentPage('home');
  };

  const handleDeleteAccount = async () => {
    if (currentUser?.token) {
      try {
        await fetch(`${API_URL}/api/user/delete-account`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentUser.token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Delete account error:', error);
      }
    }
    
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
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
                username={currentUser.username}
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
          <HomePage 
            username={currentUser?.username}
            authToken={currentUser?.token}
          />
        )}

        {currentPage === 'history' && currentUser && (
          <HistoryPage 
            username={currentUser.username}
            authToken={currentUser.token}
          />
        )}

        {currentPage === 'settings' && currentUser && (
          <SettingsPage
            username={currentUser.username}
            authToken={currentUser.token}
            onDeleteAccount={handleDeleteAccount}
          />
        )}
      </div>
    </div>
  );
}