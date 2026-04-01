import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (username: string, token: string, userId: number, role: string) => void;
  onBack: () => void;
}

type Tab = 'login' | 'register';

const API_URL = 'http://localhost:8000';

export function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: loginData.username,
          password: loginData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('authToken', data.access_token);
        localStorage.setItem('refreshToken', data.refresh_token); 
        localStorage.setItem('username', data.username);
        localStorage.setItem('userId', data.user_id.toString());
        localStorage.setItem('userRole', data.role); 
        
        onLogin(data.username, data.access_token, data.user_id, data.role);
      } else {
        setError(data.detail || 'Ошибка входа');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (registerData.password !== registerData.confirmPassword) {
      setError('Пароли не совпадают');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: registerData.username,
          password: registerData.password,
          confirm_password: registerData.confirmPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('authToken', data.access_token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userId', data.user_id.toString());
        
        onLogin(data.username, data.access_token, data.user_id, data.role);
      } else {
        setError(data.detail || 'Ошибка регистрации');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div 
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'linear-gradient(to bottom, #4ade80, #16a34a)'
          }}
        >
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setActiveTab('login');
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                activeTab === 'login'
                  ? 'bg-white text-green-700'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Вход
            </button>
            <button
              onClick={() => {
                setActiveTab('register');
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                activeTab === 'register'
                  ? 'bg-white text-green-700'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Регистрация
            </button>
          </div>

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-white mb-2">Логин</label>
                <input
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  className="w-full px-4 py-2 rounded-md bg-white/90 text-gray-800 outline-none focus:ring-2 focus:ring-white"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-white mb-2">Пароль</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full px-4 py-2 rounded-md bg-white/90 text-gray-800 outline-none focus:ring-2 focus:ring-white"
                  required
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md transition-colors"
              >
                {isLoading ? 'Вход...' : 'Войти'}
              </button>
            </form>
          )}

          {/* Register Form */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-white mb-2">Логин</label>
                <input
                  type="text"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  className="w-full px-4 py-2 rounded-md bg-white/90 text-gray-800 outline-none focus:ring-2 focus:ring-white"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-white mb-2">Пароль</label>
                <input
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  className="w-full px-4 py-2 rounded-md bg-white/90 text-gray-800 outline-none focus:ring-2 focus:ring-white"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-white mb-2">Повторите пароль</label>
                <input
                  type="password"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 rounded-md bg-white/90 text-gray-800 outline-none focus:ring-2 focus:ring-white"
                  required
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md transition-colors"
              >
                {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
              </button>
            </form>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 border-2 border-green-600 bg-white rounded-lg p-4">
            <p className="text-green-800">{error}</p>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={onBack}
          className="mt-4 text-white hover:text-green-300 transition-colors"
          disabled={isLoading}
        >
          ← Вернуться на главную
        </button>
      </div>
    </div>
  );
}