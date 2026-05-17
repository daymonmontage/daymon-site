import { playSfx, bgMusic } from './utils.js'; 
import { triggerAchievement } from './achievements.js';

const SECRET_CODES = {
    'meow':   { type: 'video', src: 'assets/cat-piano.mp4' },
    'monica':  { type: 'image-peek', src: 'assets/monica.png' },
    'daymon': { type: 'barrel-roll' }
};

// === НАСТРОЙКИ ДЕТЕКТОРА ===
let clickHistory = [];
const CLICK_THRESHOLD = 14; // Снизили до 14 кликов в секунду (реально сделать руками, если постараться)
const TIME_WINDOW = 1000;   // Окно времени оставляем 1 секунду
const PIXEL_VARIANCE = 30;  // Увеличили до 30 пикселей, чтобы прощать дрожание руки при фаст-клике
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

        clickHistory.push({ time: now, x: x, y: y });

        clickHistory = clickHistory.filter(c => now - c.time < TIME_WINDOW);

        if (clickHistory.length >= CLICK_THRESHOLD) {
            const minX = Math.min(...clickHistory.map(c => c.x));
            const maxX = Math.max(...clickHistory.map(c => c.x));
            const minY = Math.min(...clickHistory.map(c => c.y));
            const maxY = Math.max(...clickHistory.map(c => c.y));

            const varianceX = maxX - minX;
            const varianceY = maxY - minY;

            if (varianceX < PIXEL_VARIANCE && varianceY < PIXEL_VARIANCE) {
                triggerScreamer();
                clickHistory = []; 
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

const RU_TO_EN_MAP = {
    'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p', 'х': '[', 'ъ': ']',
    'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k', 'д': 'l', 'ж': ';', 'э': "'",
    'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm', 'б': ',', 'ю': '.'
};

function setupKeyboardSecrets() {
    let keyBuffer = '';
    const bufferLimit = 15; 

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.altKey || e.metaKey) return;

        let key = e.key.toLowerCase();

        if (RU_TO_EN_MAP[key]) {
            key = RU_TO_EN_MAP[key];
        }

        if (key.length !== 1) return;

        keyBuffer += key;
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