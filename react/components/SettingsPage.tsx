import React, { useState } from 'react';

interface SettingsPageProps {
  username: string;
  onDeleteAccount: () => void;
}

export function SettingsPage({ username, onDeleteAccount }: SettingsPageProps) {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const users = JSON.parse(localStorage.getItem('users') || '{}');

    if (users[username] !== passwordData.currentPassword) {
      setMessage('Неверный текущий пароль');
      setMessageType('error');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('Новые пароли не совпадают');
      setMessageType('error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage('Пароль должен содержать минимум 6 символов');
      setMessageType('error');
      return;
    }

    users[username] = passwordData.newPassword;
    localStorage.setItem('users', JSON.stringify(users));

    setMessage('Пароль успешно изменен');
    setMessageType('success');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо.')) {
      const users = JSON.parse(localStorage.getItem('users') || '{}');
      delete users[username];
      localStorage.setItem('users', JSON.stringify(users));
      
      // Delete user history
      localStorage.removeItem(`history_${username}`);
      
      onDeleteAccount();
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        {/* Change Password */}
        <div 
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'linear-gradient(to bottom, #4ade80, #16a34a)'
          }}
        >
          <h2 className="text-white text-2xl mb-6">Изменить пароль</h2>
          
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-white mb-2">Текущий пароль</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full px-4 py-2 rounded-md bg-white/90 text-gray-800 outline-none focus:ring-2 focus:ring-white"
                required
              />
            </div>
            <div>
              <label className="block text-white mb-2">Новый пароль</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full px-4 py-2 rounded-md bg-white/90 text-gray-800 outline-none focus:ring-2 focus:ring-white"
                required
              />
            </div>
            <div>
              <label className="block text-white mb-2">Повторите новый пароль</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 rounded-md bg-white/90 text-gray-800 outline-none focus:ring-2 focus:ring-white"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2 px-4 rounded-md transition-colors"
            >
              Изменить пароль
            </button>
          </form>

          {message && (
            <div className={`mt-4 border-2 rounded-lg p-4 ${
              messageType === 'error'
                ? 'border-red-400 bg-red-50'
                : 'border-green-600 bg-white'
            }`}>
              <p className={messageType === 'error' ? 'text-red-800' : 'text-green-800'}>
                {message}
              </p>
            </div>
          )}
        </div>

        {/* Delete Account */}
        <div 
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'linear-gradient(to bottom, #4ade80, #16a34a)'
          }}
        >
          <p className="text-white/80 mb-4">
            Внимание: удаление аккаунта приведет к безвозвратной потере всех ваших данных, включая историю анализов.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-md transition-colors"
          >
            Удалить аккаунт
          </button>
        </div>
      </div>
    </main>
  );
}
