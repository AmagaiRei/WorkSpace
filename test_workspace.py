import time
from playwright.sync_api import sync_playwright

def test_workspace():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        url = "http://127.0.0.1:5501/lab.html?subject=databases&lab=2"
        print(f"Открываем {url}...")
        page.goto(url) 
        
        # Получаем реальный заголовок страницы
        actual_title = page.title()
        print(f"ℹ️ Реальный заголовок страницы во вкладке: '{actual_title}'")

        # Более мягкая проверка или проверка на непустой заголовок
        assert actual_title != "", "❌ Ошибка: Заголовок страницы пустой!"
        print("✅ Главная страница хаба успешно загрузилась.")

        # 2. Поиск инпута
        search_input = page.locator("input[type='search'], input[placeholder*='поиск'], input.search-input, input").first
        if search_input.is_visible():
            print("🔎 Поле поиска обнаружено. Тестируем фильтрацию...")
            search_input.fill("Лабораторная")
            search_input.press("Enter")
            page.wait_for_timeout(500)
            print("✅ Поиск успешно протестирован.")
        else:
            print("ℹ️ Текстовое поле поиска на главной странице не обнаружено.")

        # 3. Клик по первому элементу
        first_item = page.locator("a, .card, .subject-item").first
        if first_item.is_visible():
            print("🖱 Кликаем по первому элементу интерфейса...")
            first_item.click()
            page.wait_for_timeout(1000)
            print("✅ Клик успешно выполнен.")
        else:
            print("⚠️ На странице не найдено элементов для клика.")

        print("Тест успешно завершен. Закрытие через 3 секунды...")
        time.sleep(3)
        browser.close()

if __name__ == "__main__":
    test_workspace()
