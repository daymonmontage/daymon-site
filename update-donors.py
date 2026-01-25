import json
import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By

# === НАСТРОЙКИ ===
# Твоя ссылка на виджет (Instream Stats)
# Убедись, что в настройках виджета на DonationAlerts стоит "Отображать: Список" и период "Все время" или "Месяц"
WIDGET_URL = "https://www.donationalerts.com/widget/stream-stats/2393477?token=lUGZseOunlmIPUsVSlty"

# Куда сохранять файл (путь к assets)
OUTPUT_FILE = "assets/donors.json"
# =================

def main():
    print("🚀 Запуск сборщика донатов...")
    
    # Настройка скрытого браузера
    options = Options()
    options.add_argument("--headless") # Без окна
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

    try:
        print(f"🔗 Открываем виджет: {WIDGET_URL}")
        driver.get(WIDGET_URL)
        
        # Ждем загрузки виджета (5 секунд)
        time.sleep(5)
        
        # Пытаемся найти элементы списка
        # DonationAlerts обычно использует такие классы в виджетах
        donors = []
        
        # Ищем элементы списка (обычно это <div> или <li>)
        # В виджете статистики классы могут быть сгенерированными, поэтому берем по тексту
        
        # Вариант парсинга: ищем все текстовые блоки
        # Обычно структура: .b-widget-list__item -> ._name, ._sum
        
        items = driver.find_elements(By.CLASS_NAME, "b-widget-list__item")
        
        if not items:
            # Если специфичные классы не найдены, пробуем просто взять весь текст и разбить
            print("⚠️ Стандартные классы не найдены, пробуем альтернативный поиск...")
            body_text = driver.find_element(By.TAG_NAME, "body").text
            lines = body_text.split('\n')
            # Простой парсер строк "Ник - Сумма"
            for line in lines:
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 2:
                        # Грубая попытка определить, что это донат
                        name = parts[0]
                        amount = " ".join(parts[1:])
                        donors.append({
                            "name": name,
                            "amount": amount,
                            "type": "gold" if any(x in amount for x in ["500", "1000", "5000"]) else "normal"
                        })
        else:
            # Если классы найдены (красивый парсинг)
            for item in items:
                try:
                    name = item.find_element(By.CLASS_NAME, "_name").text
                    amount = item.find_element(By.CLASS_NAME, "_sum").text
                    
                    donors.append({
                        "name": name,
                        "amount": amount,
                        "type": "gold" if any(c.isdigit() for c in amount) and len(amount) > 4 else "normal"
                    })
                except:
                    continue

        if len(donors) == 0:
            print("❌ Не удалось найти донатеров. Возможно, виджет пуст или требует авторизации.")
            # Добавим тестовые данные, чтобы файл не был пустым
            donors = [
                {"name": "DaymonFan", "amount": "100 RUB", "type": "normal"},
                {"name": "System_Test", "amount": "Parse_Error", "type": "normal"}
            ]
        else:
            print(f"✅ Успешно найдено {len(donors)} донатеров!")

        # Сохраняем в JSON
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(donors, f, ensure_ascii=False, indent=2)
            
        print(f"💾 Файл сохранен: {OUTPUT_FILE}")

    except Exception as e:
        print(f"🔥 Ошибка: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    main()