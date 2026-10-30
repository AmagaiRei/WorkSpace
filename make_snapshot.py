from playwright.sync_api import sync_playwright

def capture_workspace():
    with sync_playwright() as p:
        # Запускаем браузер в фоновом режиме
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Задаем стандартное разрешение экрана (ноутбук)
        page.set_viewport_size({"width": 1280, "height": 800})
        
        url = "http://127.0.0.1:5501/lab.html?subject=databases&lab=2"
        print(f"Подключение к {url}...")
        
        try:
            page.goto(url, wait_until="networkidle")
            
            # Делаем скриншот всей страницы (полная прокрутка)
            output_image = "workspace_review.png"
            page.screenshot(path=output_image, full_page=True)
            print(f"✅ Скриншот успешно сохранен в файл: {output_image}")
            
        except Exception as e:
            print(f"❌ Не удалось открыть страницу: {e}")
            print("Убедитесь, что Live Server запущен на порту 5501!")
            
        finally:
            browser.close()

if __name__ == "__main__":
    capture_workspace()
