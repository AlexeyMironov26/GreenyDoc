import React, { useEffect, useState } from 'react';
import { useApi } from './hooks/useApi';
import { SEO } from './SEO';

interface AdminPanelProps {
  username: string;
}

interface User {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

interface Analysis {
  id: string;
  image_url: string;
  disease_name: string;
  status: string;
  created_at: string;
  diagnosis: string;
  owner: string;
  user_id: number;
}

const API_URL = 'http://localhost:8000';

export function AdminPanel({ username }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'analyses'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ disease_name: '', status: '' });
  const { apiRequest } = useApi();

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'users' 
      ? '/api/admin/users' 
      : '/api/analyses/all';


      const res = await apiRequest(url);

      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      activeTab === 'users' ? setUsers(data) : setAnalyses(data);
      setMessage('');
    } catch (err) {
      setMessageType('error');
      setMessage('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const handleRequest = async (url: string, method: string, body?: any, successMsg?: string) => {
    try {
      const res = await  apiRequest(url, { method, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        setMessageType('success');
        setMessage(successMsg || 'Успешно');
        fetchData();
        return true;
      } else {
        setMessageType('error');
        setMessage(data.detail || 'Ошибка');
        return false;
      }
    } catch (err) {
      setMessageType('error');
      setMessage('Ошибка соединения');
      return false;
    }
  };

  const changeRole = async (userId: number, newRole: 'user' | 'admin') => {
    await handleRequest(
      `/api/admin/users/${userId}/role`, 
      'PUT', 
      { user_id: userId, new_role: newRole }, 
      `Роль изменена на ${newRole}`
    );
  };

  const deleteUser = async (userId: number, usernameToDelete: string) => {
    if (!confirm(`Удалить пользователя ${usernameToDelete}?`)) return;
    await handleRequest(
      `/api/admin/users/${userId}`, 
      'DELETE', 
      undefined, 
      'Пользователь удалён'
    );
  };

  const updateAnalysis = async (id: string) => {
    const success = await handleRequest(
      `/api/analyses/${id}`, 
      'PUT', 
      editData, 
      'Анализ обновлён'
    );
    if (success) setEditingId(null);
  };

  const deleteAnalysis = async (id: string) => {
    if (!confirm('Удалить анализ?')) return;
    await handleRequest(
      `/api/analyses/${id}`, 
      'DELETE', 
      undefined, 
      'Анализ удалён'
    );
  };

  const createAnalysis = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiRequest('/api/analyses', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setMessageType('success');
        setMessage('Анализ создан');
        if (activeTab === 'analyses') fetchData();
      } else {
        setMessageType('error');
        setMessage(data.detail || 'Ошибка создания');
      }
    } catch (err) {
      setMessageType('error');
      setMessage('Ошибка соединения');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <SEO 
        title="Админ-панель"
        description="Управление пользователями и анализами."
        noindex={true}
      />

    <div className="admin-panel">
      <div className="admin-header">
        <h1>Панель администратора</h1>
        <p>Вы вошли как: <strong>{username}</strong> (админ)</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Пользователи {users.length > 0 && `(${users.length})`}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analyses' ? 'active' : ''}`}
          onClick={() => setActiveTab('analyses')}
        >
          📊 Все анализы {analyses.length > 0 && `(${analyses.length})`}
        </button>
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          <span>{messageType === 'error' ? '❌' : '✅'}</span>
          <span>{message}</span>
        </div>
      )}

      <div className="content">
        {loading ? (
          <div className="loading">Загрузка...</div>
        ) : activeTab === 'users' ? (
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Логин</th>
                  <th>Роль</th>
                  <th>Дата</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>#{user.id}</td>
                    <td>{user.username}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <div className="actions">
                        {user.role !== 'admin' && (
                          <button 
                            className="btn-purple"
                            onClick={() => changeRole(user.id, 'admin')}
                          >
                            👤⬆️В админы
                          </button>
                        )}
                        {user.role === 'admin' && user.username !== username && (
                          <button 
                            className="btn-blue"
                            onClick={() => changeRole(user.id, 'user')}
                          >
                            👤 В юзеры
                          </button>
                        )}
                        {user.username !== username && (
                          <button 
                            className="btn-red"
                            onClick={() => deleteUser(user.id, user.username)}
                          >
                            🗑️ Удалить
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="analyses-section">
            <div className="analyses-list">
              {analyses.length === 0 ? (
                <div className="empty-state">📭 Анализов пока нет</div>
              ) : (
                analyses.map(analysis => (
                  <div key={analysis.id} className="analysis-card">
                    {editingId === analysis.id ? (
                      <div className="edit-form">
                        <input
                          type="text"
                          placeholder="Название болезни"
                          value={editData.disease_name}
                          onChange={(e) => setEditData({...editData, disease_name: e.target.value})}
                        />
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData({...editData, status: e.target.value})}
                        >
                          <option value="">Выберите статус</option>
                          <option value="disease_found">🦠 Болезнь найдена</option>
                          <option value="no_disease">✅ Здоров</option>
                          <option value="no_leaves">🍂 Нет листьев</option>
                        </select>
                        <div className="edit-actions">
                          <button 
                            className="btn-green"
                            onClick={() => updateAnalysis(analysis.id)}
                          >
                            💾 Сохранить
                          </button>
                          <button 
                            className="btn-gray"
                            onClick={() => {
                              setEditingId(null);
                              setEditData({ disease_name: '', status: '' });
                            }}
                          >
                            ✖ Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="analysis-header">
                          <span className="analysis-id">#{analysis.id}</span>
                          <span className="analysis-owner">👤 {analysis.owner}</span>
                          <span className={`status-badge ${analysis.status}`}>
                            {analysis.status === 'disease_found' && '🦠 Болезнь'}
                            {analysis.status === 'no_disease' && '✅ Здоров'}
                            {analysis.status === 'no_leaves' && '🍂 Нет листьев'}
                          </span>
                        </div>
                        <div className="analysis-body">
                          <p>🌿 {analysis.diagnosis || 'Растение не определено'}</p>
                          {analysis.disease_name && (
                            <p className="disease-name">"{analysis.disease_name}"</p>
                          )}
                          <p className="analysis-date">📅 {formatDate(analysis.created_at)}</p>
                        </div>
                        <div className="analysis-actions">
                          <button 
                            className="btn-edit"
                            onClick={() => {
                              setEditingId(analysis.id);
                              setEditData({
                                disease_name: analysis.disease_name || '',
                                status: analysis.status
                              });
                            }}
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => deleteAnalysis(analysis.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </>
  );
}