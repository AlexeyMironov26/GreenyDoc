import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (username: string) => void;
  onBack: () => void;
}

type Tab = 'login' | 'register';

export function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Mock authentication - check if user exists in localStorage
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    
    if (!users[loginData.username]) {
      setError('Пользователь не найден');
      return;
    }

    if (users[loginData.username] !== loginData.password) {
      setError('Неверный пароль');
      return;
    }

    onLogin(loginData.username);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (registerData.username.length < 3) {
      setError('Логин должен содержать минимум 3 символа');
      return;
    }

    if (registerData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    // Save user to localStorage
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    
    if (users[registerData.username]) {
      setError('Пользователь уже существует');
      return;
    }

    users[registerData.username] = registerData.password;
    localStorage.setItem('users', JSON.stringify(users));

    onLogin(registerData.username);
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
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2 px-4 rounded-md transition-colors"
              >
                Войти
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
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2 px-4 rounded-md transition-colors"
              >
                Зарегистрироваться
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
        >
          ← Вернуться на главную
        </button>
      </div>
    </div>
  );
}
