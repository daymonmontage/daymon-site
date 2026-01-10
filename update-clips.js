const fs = require('fs');
const https = require('https');

// === НАСТРОЙКИ ===
const CHANNEL_NAME = 'daymonmontage';
const CLIPS_COUNT = 30;
const OUTPUT_FILE = 'assets/clips.json';
// =================

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Ошибка: Не заданы API ключи (TWITCH_CLIENT_ID / SECRET).');
    process.exit(1);
}

function request(url, options, data = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function run() {
    try {
        console.log('1. Получаем токен доступа...');
        const authData = await request(`https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`, {
            method: 'POST'
        });
        
        if (!authData.access_token) throw new Error('Не удалось получить токен');
        const accessToken = authData.access_token;

        console.log(`2. Ищем ID канала ${CHANNEL_NAME}...`);
        const userRes = await request(`https://api.twitch.tv/helix/users?login=${CHANNEL_NAME}`, {
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!userRes.data || userRes.data.length === 0) throw new Error('Канал не найден');
        const broadcasterId = userRes.data[0].id;

        console.log(`3. Загружаем ТОП-${CLIPS_COUNT} популярных клипов за всё время...`);
        const clipsRes = await request(`https://api.twitch.tv/helix/clips?broadcaster_id=${broadcasterId}&first=${CLIPS_COUNT}`, {
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!clipsRes.data) throw new Error('Ошибка при получении клипов');

        const clipIds = clipsRes.data.map(clip => clip.id);
        console.log(`Успешно получено клипов: ${clipIds.length}`);

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(clipIds, null, 2));
        console.log(`✅ Файл ${OUTPUT_FILE} обновлен! Список: Топ за всё время.`);

    } catch (error) {
        console.error('CRITICAL ERROR:', error);
        process.exit(1);
    }
}

run();