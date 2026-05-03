import { useCallback } from 'react';

const API_URL = 'http://localhost:8000';

export function useApi() {
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;
    
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('authToken', data.access_token);
        if (data.refresh_token) localStorage.setItem('refreshToken', data.refresh_token);
        return data.access_token;
      }
    } catch (e) {}
    return null;
  }, []);

  const apiRequest = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    let token = localStorage.getItem('authToken');
    
    const makeRequest = () => fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    let response = await makeRequest();
    
    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        token = newToken;
        response = await makeRequest();
      }
    }
    
    return response;
  }, [refreshAccessToken]);

  return { apiRequest };
}