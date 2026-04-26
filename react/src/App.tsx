import React, { useState, useEffect } from 'react';
import { LoginPage } from '../components/LoginPage';
import { HomePage } from '../components/HomePage';
import { HistoryPage } from '../components/HistoryPage';
import { SettingsPage } from '../components/SettingsPage';
import { UserMenu } from '../components/UserMenu';
import { AdminPanel } from '../components/AdminPanel';

const backgroundImage = './images/background.png'
const API_URL = 'http://localhost:8000'; // FastAPI сервер

type Page = 'home' | 'login' | 'history' | 'settings'| 'admin';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home'); 
  const [currentUser, setCurrentUser] = useState<{
    username: string, 
    token: string,
    id: number,
    role?: string //необязательное поле 
   } | null>(null);

  //Восстановление сессии из localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUsername = localStorage.getItem('username');
    const savedUserId = localStorage.getItem('userId');
    const savedRole = localStorage.getItem('userRole');
    
    if (savedToken && savedUsername && savedUserId) {
      setCurrentUser({
        username: savedUsername,
        token: savedToken,
        id: Number(savedUserId),
        role: savedRole || 'user' 
      });
      console.log('✅ Сессия восстановлена для:', savedUsername);
    }
  }, []);

  //данные уже в localStorage
  const handleLogin = (username: string, token: string, userId: number, role: string) => {
    setCurrentUser({
      username,
      token,
      id: userId,
      role

    });
    setCurrentPage('home');
  };

  // handleLogout очищает все сохраненные данные


const handleLogout = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ refresh_token: refreshToken})
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    setCurrentUser(null);
    // Очищаем все сохраненные данные
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole')
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
    // Очищаем все сохраненные данные
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
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
                key={currentUser.role}
                username={currentUser.username}
                role={currentUser.role}
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
          <HistoryPage/>
        )}

        {currentPage === 'settings' && currentUser && (
          <SettingsPage
            username={currentUser.username}
            authToken={currentUser.token}
            onDeleteAccount={handleDeleteAccount}
          />
        )}

        {currentPage === 'admin' && currentUser && (
          <AdminPanel 
            username={currentUser.username}
          />
          )}
      </div>
    </div>
  );
}