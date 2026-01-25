import { playSfx, bgMusic } from './utils.js'; 
import { triggerAchievement } from './achievements.js';

const SECRET_CODES = {
    'meow':   { type: 'video', src: 'assets/cat-piano.mp4' },
    'monica':  { type: 'image-peek', src: 'assets/monica.png' },
    'daymon': { type: 'barrel-roll' }
};

// === НАСТРОЙКИ ДЕТЕКТОРА ===
let clickHistory = [];
const CLICK_THRESHOLD = 24; // Подняли с 12 до 24 (только софт может так быстро)
const TIME_WINDOW = 1000;   // 1 секунда
const PIXEL_VARIANCE = 5;   // Уменьшили с 20 до 5. (Софт бьет в 1 точку, человек - нет)
let isScreaming = false;

export function initSecrets() {
    setupKeyboardSecrets();
    setupAutoclickerDetector();
}

function setupAutoclickerDetector() {
    document.addEventListener('click', (e) => {
        if (isScreaming) return;

        const now = Date.now();
        const x = e.clientX;
        const y = e.clientY;

        // Добавляем клик
        clickHistory.push({ time: now, x: x, y: y });

        // Удаляем клики старше 1 секунды
        clickHistory = clickHistory.filter(c => now - c.time < TIME_WINDOW);

        // Если набралось достаточно кликов для проверки
        if (clickHistory.length >= CLICK_THRESHOLD) {
            
            // Проверяем разброс координат
            const minX = Math.min(...clickHistory.map(c => c.x));
            const maxX = Math.max(...clickHistory.map(c => c.x));
            const minY = Math.min(...clickHistory.map(c => c.y));
            const maxY = Math.max(...clickHistory.map(c => c.y));

            const varianceX = maxX - minX;
            const varianceY = maxY - minY;

            // ЕСЛИ кликов очень много И курсор почти не двигался (признак робота)
            if (varianceX < PIXEL_VARIANCE && varianceY < PIXEL_VARIANCE) {
                triggerScreamer();
                clickHistory = []; // Сбрасываем, чтобы не зациклило
            }
        }
    });
}

function triggerScreamer() {
    isScreaming = true;

    // === ЛОГИКА МУЗЫКИ: ПАУЗА ===
    let wasMusicPlaying = !bgMusic.paused;
    if (wasMusicPlaying) {
        bgMusic.pause();
    }

    const audio = new Audio('assets/scrm.mp3');
    audio.volume = 1.0; 

    audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration; 

        const overlay = document.createElement('div');
        overlay.className = 'screamer-overlay';
        
        const img = document.createElement('img');
        img.src = 'assets/scrm.png';
        img.className = 'screamer-img';
        
        // Половина длительности
        img.style.transitionDuration = `${duration / 2}s`; 

        overlay.appendChild(img);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.add('fade-to-black');
            audio.play().catch(e => console.error("Audio block:", e));

            setTimeout(() => {
                img.classList.add('rise-up');
            }, 50);
        });

        audio.onended = () => {
            overlay.style.transition = 'opacity 0.5s';
            overlay.style.opacity = '0';
            
            setTimeout(() => {
                overlay.remove();
                isScreaming = false;

                // Ачивка
                const dummyEl = document.createElement('div');
                dummyEl.className = 'autoclicker';
                triggerAchievement(dummyEl, 'complete'); 

                // Возобновление музыки
                if (wasMusicPlaying) {
                    bgMusic.play().catch(()=>{});
                }

            }, 500);
        };
    });
    
    audio.load();
}

function setupKeyboardSecrets() {
    let keyBuffer = '';
    const bufferLimit = 15; 

    document.addEventListener('keydown', (e) => {
        keyBuffer += e.key.toLowerCase();
        if (keyBuffer.length > bufferLimit) keyBuffer = keyBuffer.slice(-bufferLimit);
        
        Object.keys(SECRET_CODES).forEach(code => {
            if (keyBuffer.includes(code)) {
                activateSecret(SECRET_CODES[code]);
                keyBuffer = ''; 
            }
        });
    });
}

function activateSecret(data) {
    if (data.type === 'video') {
        const overlay = document.createElement('div');
        overlay.className = 'video-overlay';
        overlay.innerHTML = `<video class="secret-video" autoplay><source src="${data.src}" type="video/mp4"></video>`;
        document.body.appendChild(overlay);
        const v = overlay.querySelector('video');
        v.volume = 0.6;
        const finish = () => { overlay.remove(); };
        v.onended = finish;
        overlay.onclick = finish;
    }
    else if (data.type === 'image-peek') {
        playSfx('hover');
        const img = document.createElement('img');
        img.src = data.src; img.className = 'monica-entity';
        document.body.appendChild(img);
        setTimeout(() => img.classList.add('peek'), 50);
        setTimeout(() => { img.classList.remove('peek'); setTimeout(() => img.remove(), 1000); }, 3000);
    }
    else if (data.type === 'barrel-roll') {
        playSfx('click');
        document.body.classList.add('barrel-roll');
        setTimeout(() => document.body.classList.remove('barrel-roll'), 2000);
    }
}