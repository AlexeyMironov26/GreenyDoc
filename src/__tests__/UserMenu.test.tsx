import { render, screen, fireEvent } from '@testing-library/react';
import { UserMenu } from '../../react/components/UserMenu';
import { describe, test, expect, vi } from 'vitest';

describe('UserMenu', () => {
  const mockNavigate = vi.fn();
  const mockLogout = vi.fn();

  // 3.3 Проверка ролевого поведения интерфейса
  test('админ видит пункт админ-панели', () => {
    render(<UserMenu username="admin" role="admin" onNavigate={mockNavigate} onLogout={mockLogout} />);
    fireEvent.click(screen.getByText('admin'));
    expect(screen.getByText('⚙️ Админ-панель')).toBeInTheDocument();
  });

  test('обычный пользователь не видит админ-панель', () => {
    render(<UserMenu username="user" role="user" onNavigate={mockNavigate} onLogout={mockLogout} />);
    fireEvent.click(screen.getByText('user'));
    expect(screen.queryByText('Админ-панель')).not.toBeInTheDocument();
  });
});