import requests
import json
import os
import time

CHANNEL_NAME = 'roneer_'
OUTPUT_FILE = 'assets/games.json'
CLIPS_TO_ANALYZE = 10000

CLIENT_ID = os.environ.get('TWITCH_CLIENT_ID')
CLIENT_SECRET = os.environ.get('TWITCH_CLIENT_SECRET')

def get_access_token():
    url = 'https://id.twitch.tv/oauth2/token'
    params = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'grant_type': 'client_credentials'
    }
    res = requests.post(url, params=params)
    return res.json().get('access_token')

def get_broadcaster_id(token):
    headers = {'Client-ID': CLIENT_ID, 'Authorization': f'Bearer {token}'}
    res = requests.get(f'https://api.twitch.tv/helix/users?login={CHANNEL_NAME}', headers=headers)
    data = res.json().get('data', [])
    if not data:
        raise Exception("Канал не найден")
    return data[0]['id']

def get_top_clips(token, broadcaster_id):
    headers = {'Client-ID': CLIENT_ID, 'Authorization': f'Bearer {token}'}
    clips = []
    cursor = None

    print(f"🔄 Сканируем клипы (цель: {CLIPS_TO_ANALYZE})...")

    while len(clips) < CLIPS_TO_ANALYZE:
        url = f'https://api.twitch.tv/helix/clips?broadcaster_id={broadcaster_id}&first=100'
        if cursor:
            url += f'&after={cursor}'

        res = requests.get(url, headers=headers)
        data = res.json()

        current_batch = data.get('data', [])
        if not current_batch:
            break

        clips.extend(current_batch)
        cursor = data.get('pagination', {}).get('cursor')

        if not cursor:
            break

    return clips[:CLIPS_TO_ANALYZE]

def main():
    try:
        token = get_access_token()
        if not token:
            print("❌ Ошибка получения токена")
            return

        uid = get_broadcaster_id(token)
        raw_clips = get_top_clips(token, uid)

        print(f"✅ Найдено клипов: {len(raw_clips)}")

        games_stats = {}

        for clip in raw_clips:
            gid = clip['game_id']
            if not gid: continue

            if gid not in games_stats:
                games_stats[gid] = {
                    'id': gid,
                    'name': 'Unknown',
                    'count': 0,
                    'clips': []
                }

            thumb_url = clip['thumbnail_url'].replace('{width}', '480').replace('{height}', '272')

            clip_data = {
                'id': clip['id'],
                'title': clip['title'],
                'views': clip['view_count'],
                'thumb': thumb_url,
                'url': clip['url']
            }

            games_stats[gid]['count'] += 1
            games_stats[gid]['clips'].append(clip_data)

        game_ids = list(games_stats.keys())
        print("🎨 Загружаем обложки игр...")

        headers = {'Client-ID': CLIENT_ID, 'Authorization': f'Bearer {token}'}
        unique_ids = list(set(game_ids))

        for i in range(0, len(unique_ids), 100):
            chunk = unique_ids[i:i+100]
            if not chunk: continue
            query = "&id=".join(chunk)
            url = f'https://api.twitch.tv/helix/games?id={query}'
            res = requests.get(url, headers=headers)
            gdata = res.json().get('data', [])

            for g in gdata:
                gid = g['id']
                if gid in games_stats:
                    games_stats[gid]['name'] = g['name']
                    games_stats[gid]['art'] = g['box_art_url'].replace('{width}', '285').replace('{height}', '380')

        final_list = list(games_stats.values())
        final_list.sort(key=lambda x: x['count'], reverse=True)

        final_list = [g for g in final_list if g.get('art')]

        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(final_list, f, ensure_ascii=False, indent=2)

        print(f"💾 Готово! Сохранено игр: {len(final_list)} в {OUTPUT_FILE}")

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

if __name__ == "__main__":
    main()
