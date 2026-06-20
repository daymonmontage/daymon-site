import requests
import json
import os
import time
import datetime

CHANNEL_NAME = 'daymonmontage'
OUTPUT_FILE = 'assets/games.json'

CLIENT_ID = os.environ.get('TWITCH_CLIENT_ID')
CLIENT_SECRET = os.environ.get('TWITCH_CLIENT_SECRET')

def make_request(url, headers, max_retries=3):
    """
    Выполняет HTTP GET запрос с поддержкой повторных попыток при сетевых сбоях
    и автоматическим ожиданием при лимитах (429 Too Many Requests).
    """
    for attempt in range(max_retries):
        try:
            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code == 200:
                return res
            elif res.status_code == 429:
                wait_time = 3 * (attempt + 1)
                print(f"⏳ Достигнут лимит запросов Twitch (429). Ожидание {wait_time} сек...")
                time.sleep(wait_time)
            elif res.status_code in [500, 502, 503, 504]:
                wait_time = 2 * (attempt + 1)
                print(f"⚠️ Ошибка сервера Twitch ({res.status_code}). Попытка {attempt+1}/{max_retries}. Ожидание {wait_time} сек...")
                time.sleep(wait_time)
            else:
                print(f"❌ Ошибка API Twitch ({res.status_code}): {res.text}")
                return res
        except requests.exceptions.RequestException as e:
            wait_time = 2 * (attempt + 1)
            print(f"🔌 Сетевая ошибка: {e}. Попытка {attempt+1}/{max_retries}. Ожидание {wait_time} сек...")
            time.sleep(wait_time)
    return None

def get_access_token():
    url = 'https://id.twitch.tv/oauth2/token'
    params = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'grant_type': 'client_credentials'
    }
    for attempt in range(3):
        try:
            res = requests.post(url, params=params, timeout=10)
            if res.status_code == 200:
                return res.json().get('access_token')
            else:
                print(f"❌ Ошибка авторизации Twitch ({res.status_code}): {res.text}")
        except Exception as e:
            print(f"🔌 Сетевая ошибка при авторизации: {e}. Попытка {attempt+1}/3...")
            time.sleep(2)
    return None

def get_broadcaster_id(token):
    headers = {'Client-ID': CLIENT_ID, 'Authorization': f'Bearer {token}'}
    res = make_request(f'https://api.twitch.tv/helix/users?login={CHANNEL_NAME}', headers=headers)
    if not res:
        raise Exception("Не удалось связаться с API Twitch при поиске ID канала")
    
    data = res.json().get('data', [])
    if not data:
        raise Exception(f"Канал {CHANNEL_NAME} не найден на Twitch")
    return data[0]['id']

def get_top_clips(token, broadcaster_id, start_date):
    headers = {'Client-ID': CLIENT_ID, 'Authorization': f'Bearer {token}'}
    clips = []
    
    end_date = datetime.datetime.now(datetime.timezone.utc)
    current_start = start_date
    
    print(f"🔄 Сканируем новые клипы с {current_start.strftime('%Y-%m-%d')}...")

    last_printed_year_month = ""

    while current_start < end_date:
        current_end = current_start + datetime.timedelta(days=7)
        if current_end > end_date:
            current_end = end_date
            
        started_at = current_start.isoformat().replace("+00:00", "Z")
        ended_at = current_end.isoformat().replace("+00:00", "Z")
        
        # Печатаем прогресс раз в месяц
        current_year_month = current_start.strftime('%Y-%m')
        if current_year_month != last_printed_year_month:
            print(f"⏳ Сканирование периода: {current_year_month} (собрано новых клипов в сессии: {len(clips)})...")
            last_printed_year_month = current_year_month
        
        cursor = None
        while True:
            url = f'https://api.twitch.tv/helix/clips?broadcaster_id={broadcaster_id}&first=100&started_at={started_at}&ended_at={ended_at}'
            if cursor:
                url += f'&after={cursor}'

            res = make_request(url, headers=headers)
            if not res or res.status_code != 200:
                break

            data = res.json()
            current_batch = data.get('data', [])
            if not current_batch:
                break

            clips.extend(current_batch)
            cursor = data.get('pagination', {}).get('cursor')

            if not cursor:
                break
                
        current_start = current_end

    unique_clips = {c['id']: c for c in clips}
    return list(unique_clips.values())

def main():
    try:
        # Проверяем наличие ключей
        if not CLIENT_ID or not CLIENT_SECRET:
            print("❌ Ошибка: Переменные окружения TWITCH_CLIENT_ID или TWITCH_CLIENT_SECRET не заданы!")
            return

        token = get_access_token()
        if not token:
            print("❌ Ошибка получения токена доступа")
            return

        # 1. Попытка загрузить существующие данные для инкрементального обновления
        existing_clips = {}
        existing_games_meta = {}
        start_date = datetime.datetime(2016, 1, 1, tzinfo=datetime.timezone.utc)
        
        if os.path.exists(OUTPUT_FILE):
            try:
                with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                    old_data = json.load(f)
                    latest_date = None
                    for game in old_data:
                        game_id = game.get('id', 'unknown')
                        existing_games_meta[game_id] = {
                            'name': game.get('name'),
                            'art': game.get('art')
                        }
                        for clip in game.get('clips', []):
                            # Сохраняем ID игры в клип при чтении из кэша
                            clip['game_id'] = game_id
                            existing_clips[clip['id']] = clip
                            
                            c_at = clip.get('created_at')
                            if c_at:
                                try:
                                    dt = datetime.datetime.fromisoformat(c_at.replace('Z', '+00:00'))
                                    if latest_date is None or dt > latest_date:
                                        latest_date = dt
                                except Exception:
                                    pass
                    if latest_date:
                        # Начинаем сканирование за 3 дня до последнего клипа, чтобы не потерять пограничные
                        start_date = latest_date - datetime.timedelta(days=3)
                        print(f"ℹ️ Найден существующий файл. Последний клип от: {latest_date.strftime('%Y-%m-%d %H:%M:%S')}")
                        print(f"🚀 Запускаем инкрементальное обновление с: {start_date.strftime('%Y-%m-%d')}")
            except Exception as e:
                print(f"⚠️ Не удалось прочитать старый файл ({e}). Запускаем полный скан...")

        # 2. Получаем ID стримера
        uid = get_broadcaster_id(token)
        
        # 3. Сканируем новые клипы
        raw_new_clips = get_top_clips(token, uid, start_date)
        print(f"✅ Найдено новых/обновленных клипов в сессии: {len(raw_new_clips)}")

        # 4. Объединяем старые клипы с новыми (новые перезаписывают старые, обновляя просмотры)
        for clip in raw_new_clips:
            thumb_url = clip['thumbnail_url'].replace('{width}', '480').replace('{height}', '272')
            clip_data = {
                'id': clip['id'],
                'title': clip['title'],
                'views': clip['view_count'],
                'thumb': thumb_url,
                'url': clip['url'],
                'created_at': clip['created_at'],
                'game_id': clip.get('game_id', 'unknown')
            }
            existing_clips[clip['id']] = clip_data

        # 5. Группируем объединенные клипы по играм
        games_stats = {}
        for clip_id, clip in existing_clips.items():
            gid = clip.get('game_id', 'unknown')
            if gid not in games_stats:
                meta = existing_games_meta.get(gid, {})
                games_stats[gid] = {
                    'id': gid,
                    'name': meta.get('name', 'Без категории / Неизвестно'),
                    'count': 0,
                    'clips': [],
                    'art': meta.get('art', 'https://static-cdn.jtvnw.net/ttv-static/404_boxart-285x380.jpg')
                }
            
            clip_to_save = {
                'id': clip['id'],
                'title': clip['title'],
                'views': clip['views'] if 'views' in clip else clip.get('view_count', 0),
                'thumb': clip['thumb'],
                'url': clip['url']
            }
            if 'created_at' in clip:
                clip_to_save['created_at'] = clip['created_at']
                
            games_stats[gid]['clips'].append(clip_to_save)
            games_stats[gid]['count'] += 1

        # 6. Подгружаем обложки для новых или неопределенных игр
        game_ids_to_fetch = [
            gid for gid in games_stats.keys() 
            if gid != 'unknown' and (gid not in existing_games_meta or games_stats[gid]['name'] == 'Без категории / Неизвестно')
        ]

        if game_ids_to_fetch:
            print(f"🎨 Загружаем названия и обложки для {len(game_ids_to_fetch)} новых игр...")
            headers = {'Client-ID': CLIENT_ID, 'Authorization': f'Bearer {token}'}
            unique_ids = list(set(game_ids_to_fetch))

            for i in range(0, len(unique_ids), 100):
                chunk = unique_ids[i:i+100]
                if not chunk: continue
                query = "&id=".join(chunk)
                url = f'https://api.twitch.tv/helix/games?id={query}'
                res = make_request(url, headers=headers)
                if res and res.status_code == 200:
                    gdata = res.json().get('data', [])
                    for g in gdata:
                        gid = g['id']
                        if gid in games_stats:
                            games_stats[gid]['name'] = g['name']
                            games_stats[gid]['art'] = g['box_art_url'].replace('{width}', '285').replace('{height}', '380')

        # Сортируем игры по количеству клипов (по убыванию)
        final_list = list(games_stats.values())
        final_list.sort(key=lambda x: x['count'], reverse=True)

        # Сохраняем в файл
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(final_list, f, ensure_ascii=False, indent=2)

        print(f"💾 Готово! Всего сохранено игр: {len(final_list)} (всего клипов: {len(existing_clips)}) в {OUTPUT_FILE}")

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

if __name__ == "__main__":
    main()
