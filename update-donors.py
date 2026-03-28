import json
import time
import re
import concurrent.futures
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
import os

WIDGETS = {
    "all_time": "https://www.donationalerts.com/widget/stream-stats/2402001?token=lUGZseOunlmIPUsVSlty",
    "year": "https://www.donationalerts.com/widget/stream-stats/2393477?token=lUGZseOunlmIPUsVSlty",
    "month": "https://www.donationalerts.com/widget/stream-stats/2402005?token=lUGZseOunlmIPUsVSlty",
    "stream": "https://www.donationalerts.com/widget/stream-stats/2402007?token=lUGZseOunlmIPUsVSlty"
}

OUTPUT_FILE = "assets/donors.json"

def get_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--log-level=3")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    return webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

def parse_url(key, url):
    print(f"⏳ [{key}] Запуск браузера...")
    driver = None
    donors =[]
    
    try:
        driver = get_driver()
        driver.get(url)
        
        time.sleep(4)
        
        body_text = driver.find_element(By.TAG_NAME, "body").text
        lines = body_text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line: continue
            
            if " - " in line:
                parts = line.split(" - ", 1)
                if len(parts) >= 2:
                    name = parts[0].strip()
                    amount_str = parts[1].strip()
                    
                    if name and amount_str:
                        clean_amount = re.sub(r'[^0-9]', '', amount_str.split(',')[0].split('.')[0])
                        is_gold = clean_amount and int(clean_amount) >= 1000
                        
                        donors.append({
                            "name": name,
                            "amount": amount_str,
                            "type": "gold" if is_gold else "normal"
                        })
        
        print(f"✅ [{key}] Итог: {len(donors)} записей")
        return key, donors

    except Exception as e:
        print(f"❌ [{key}] Ошибка: {e}")
        return key,[]
    finally:
        if driver:
            driver.quit()

def main():
    print("🚀 Запуск сборщика донатов (Selenium)...")
    start_time = time.time()
    
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    final_data = {}
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        future_to_url = {executor.submit(parse_url, key, url): key for key, url in WIDGETS.items()}
        
        for future in concurrent.futures.as_completed(future_to_url):
            key, data = future.result()
            final_data[key] = data

    total_donors = sum(len(v) for v in final_data.values())

    try:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(final_data, f, ensure_ascii=False, indent=2)
        
        elapsed = time.time() - start_time
        print(f"\n💾 Готово за {elapsed:.2f} сек! Файл сохранен: {OUTPUT_FILE}")
        print(f"📊 Всего записей: {total_donors}")
        
    except Exception as e:
        print(f"🔥 Ошибка сохранения файла: {e}")

if __name__ == "__main__":
    main()