import { test, expect } from '@playwright/test';

test('полный бизнес-сценарий', async ({ page }) => {
  // 4.1 Регистрация (вместо входа)
  await page.goto('http://localhost:5173');
  await page.click('text=Войти');
  await page.click('text=Регистрация');
  await page.fill('input[placeholder="Логин"]', 'testuser');
  await page.fill('input[type="password"]', 'test123');
  await page.fill('input[placeholder="Повторите пароль"]', 'test123');
  await page.click('button:has-text("Зарегистрироваться")');
  await expect(page.locator('button:has-text("testuser")')).toBeVisible();

  // 4.2 CRUD + 4.4 загрузка файла + 4.5 работа со сторонним API
  const fileInput = page.locator('input[type="file"]');
  
  await fileInput.setInputFiles('e2e/fixtures/leaf.jpg'); 
  
  await page.click('button:has-text("Анализировать")');
  await expect(page.locator('text=Обнаружено заболевание')).toBeVisible({ timeout: 30000 });

  // 4.3 Фильтрация/пагинация (через историю)
  await page.click('button:has-text("testuser")');
  await page.click('text=История анализов');
  await expect(page.locator('.grid')).toBeVisible();

  // 4.1 Выход
  await page.click('button:has-text("testuser")');
  await page.click('text=Выйти из аккаунта');
  await expect(page.locator('text=Войти')).toBeVisible();
});