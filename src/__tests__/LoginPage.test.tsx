import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../../react/components/LoginPage';
import { HelmetProvider } from 'react-helmet-async';
import { beforeEach, describe, test, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

describe('LoginPage', () => {
  const mockOnLogin = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as vi.Mock).mockReset();
  });

  // 3.1 Модульный тест компонента
  test('переключение между вкладками', () => {
    render(
      <HelmetProvider>
        <LoginPage onLogin={mockOnLogin} onBack={mockOnBack} />
      </HelmetProvider>
    );
    
    // Нажимаем на вкладку "Регистрация"
    fireEvent.click(screen.getByText('Регистрация'));
    
    // Ищем поле ввода по placeholder или по тексту label (используем getByText + parent)
    const passwordConfirmInput = screen.getByPlaceholderText('Повторите пароль');
    expect(passwordConfirmInput).toBeInTheDocument();
  });

  // 3.2 Тест пользовательского сценария (форма)
  test('успешный вход', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'token', refresh_token: 'rt', username: 'user', user_id: 1, role: 'user' })
    });
    
    render(
      <HelmetProvider>
        <LoginPage onLogin={mockOnLogin} onBack={mockOnBack} />
      </HelmetProvider>
    );
    
    // Используем getByPlaceholderText вместо getByLabelText
    fireEvent.change(screen.getByPlaceholderText('Логин'), { target: { value: 'user' } });
    fireEvent.change(screen.getByPlaceholderText('Пароль'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
    
    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('user', 'token', 1, 'user');
    });
  });
});