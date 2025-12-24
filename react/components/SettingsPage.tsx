import React, { useState } from 'react';

interface SettingsPageProps {
  username: string;
  authToken: string;
  onDeleteAccount: () => void;
}

const API_URL = 'http://localhost:8000';

export function SettingsPage({ username, authToken, onDeleteAccount }: SettingsPageProps) {
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setMessage('Новые пароли не совпадают');
      setMessageType('error');
      setIsLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage('Пароль должен содержать минимум 6 символов');
      setMessageType('error');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/user/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          old_password: passwordData.oldPassword,
          new_password: passwordData.newPassword,
          confirm_new_password: passwordData.confirmNewPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Пароль успешно изменен');
        setMessageType('success');
        setPasswordData({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
      } else {
        setMessage(data.detail || 'Ошибка изменения пароля');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Ошибка соединения с сервером');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо.')) {
      setIsLoading(true);
      
      try {
        const response = await fetch(`${API_URL}/api/user/delete-account`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          onDeleteAccount();
        } else {
          const data = await response.json();
          alert(data.detail || 'Ошибка удаления аккаунта');
        }
      } catch (error) {
        alert('Ошибка соединения с сервером');
      } finally {
        setIsLoading(false);
      }
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
                value={passwordData.oldPassword}
                onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                className="w-full px-4 py-2 rounded-md bg-white/90 text-gray-800 outline-none focus:ring-2 focus:ring-white"
                required
                disabled={isLoading}
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
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-white mb-2">Повторите новый пароль</label>
              <input
                type="password"
                value={passwordData.confirmNewPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
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
              {isLoading ? 'Изменение...' : 'Изменить пароль'}
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
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-6 rounded-md transition-colors"
          >
            {isLoading ? 'Удаление...' : 'Удалить аккаунт'}
          </button>
        </div>
      </div>
    </main>
  );
}