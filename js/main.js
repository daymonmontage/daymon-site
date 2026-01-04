/*
 * DaymonMontage Hub Logic
 * Developer: Torgovets
 * 2026
 */

// --- Настройки ---
const CHANNEL_NAME = 'daymonmontage';
const VOLUME_LEVEL = 0.4;
const TILT_FORCE = 3; // Сила наклона карточек

// Домены, где разрешен плеер Twitch
const ALLOWED_HOSTS = [
    "daymonmontage.github.io",
    "itservicepgatk.github.io",
    "github.io",
    "localhost",
    "127.0.0.1"
];

// --- Инициализация при загрузке ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Приветствие в консоли для любопытных
    console.log(`%c DAYMON HUB %c SYSTEM ONLINE \n`, 
        'background: #f97316; color: #000; padding: 4px; font-weight: bold;', 
        'color: #f97316;'
    );

    // Запуск модулей
    setupTiltEffect();
    renderSpaceBackground();
    setupEasterEgg();
    checkTwitchStatus();
});

// Убираем прелоадер после полной загрузки страницы
window.addEventListener('load', () => {
    const loader = document.getElementById('preloader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('finished');
        }, 600);
    }
});

/* 
 * 1. 3D Эффект для карточек
 * Поворачивает элементы в сторону мыши
 */
function setupTiltEffect() {
    const cards = document.querySelectorAll('.tilt-effect');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const cardRect = card.getBoundingClientRect();
            
            // Координаты мыши внутри карточки
            const x = e.clientX - cardRect.left;
            const y = e.clientY - cardRect.top;

            // Центр карточки
            const centerX = cardRect.width / 2;
            const centerY = cardRect.height / 2;
            
            // Вычисляем угол поворота
            // Делим на centerY/centerX, чтобы получить значения от -1 до 1
            const rotateX = ((y - centerY) / centerY) * -TILT_FORCE; 
            const rotateY = ((x - centerX) / centerX) * TILT_FORCE;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
        });

        // Сброс при уходе мыши
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });
}

/* 
 * 2. Космический фон (Canvas)
 * Рисует падающие звезды/частицы как в VotV
 */
function renderSpaceBackground() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Стили канваса
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-2'; // Под всем контентом
    canvas.style.pointerEvents = 'none';
    
    document.body.appendChild(canvas);

    let width, height;
    let stars = [];
    const STAR_COUNT = 90;

    // Обновляем размеры при ресайзе окна
    const resize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    };

    // Создаем массив звезд
    const initStars = () => {
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 0.5, // Размер от 0.5 до 2.5
                speed: Math.random() * 0.5 + 0.1 // Скорость падения
            });
        }
    };

    // Главный цикл анимации
    const animate = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // Полупрозрачный белый
        
        stars.forEach(star => {
            // Двигаем вниз
            star.y -= star.speed;
            
            // Если улетела вверх (эффект полета сквозь космос), сбрасываем вниз
            if (star.y < 0) {
                star.y = height;
                star.x = Math.random() * width;
            }
            
            // Рисуем точку
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    initStars();
    animate();
}

/* 
 * 3. Пасхалка (Клик по аватару)
 * Мяукает и трясется
 */
function setupEasterEgg() {
    const avatar = document.querySelector('.avatar-container img');
    if (!avatar) return;

    const meowSound = new Audio('assets/meow.mp3');
    meowSound.volume = VOLUME_LEVEL;

    avatar.addEventListener('click', () => {
        // Анимация тряски
        avatar.style.transition = '0.1s';
        avatar.style.transform = 'scale(1.1) rotate(15deg)';
        
        // Звук
        // try-catch нужен, так как браузеры блокируют автоплей без взаимодействия
        try {
            meowSound.currentTime = 0;
            meowSound.play().catch(() => console.log("Audio play blocked"));
        } catch (e) {
            console.error("Audio file missing?");
        }

        // Возврат в исходное положение
        setTimeout(() => { avatar.style.transform = 'scale(1.1) rotate(-15deg)'; }, 100);
        setTimeout(() => { 
            avatar.style.transition = '0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            avatar.style.transform = 'scale(1) rotate(0deg)'; 
        }, 300);
    });
}

/* 
 * 4. Проверка статуса Twitch
 * Используем API-прокси для обхода CORS
 */
async function checkTwitchStatus() {
    const statusEl = document.getElementById('stream-status');
    const liveBox = document.getElementById('live-box');
    
    if (!statusEl) return;

    const ui = {
        icon: statusEl.querySelector('i'),
        text: statusEl.querySelector('.status-text')
    };

    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=https://decapi.me/twitch/uptime/${CHANNEL_NAME}`;

    try {
        const response = await fetch(proxyUrl);
        const data = await response.text();
        
        // Если ответ содержит "offline", значит стрима нет
        const isOffline = data.toLowerCase().includes('offline');

        if (isOffline) {
            // ОФФЛАЙН
            ui.text.textContent = 'Offline';
            ui.icon.style.color = '#71717a';
            statusEl.classList.remove('online');
            if(liveBox) liveBox.style.display = 'none';
        } else {
            // ОНЛАЙН
            ui.text.textContent = 'LIVE';
            statusEl.classList.add('online');
            if(liveBox) {
                liveBox.style.display = 'block';
                loadTwitchEmbed(); // Грузим плеер только если стрим идет
            }
        }
    } catch (err) {
        console.warn('Twitch Status API Error:', err);
        ui.text.textContent = 'Unknown';
    }
}

/* 
 * 4. Twitch Cover (Вместо плеера)
 */
function loadTwitchEmbed() {
    const embedId = 'twitch-embed';
    const container = document.getElementById(embedId);
    
    if (container && container.innerHTML === "") {
        
        const thumbnailUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${CHANNEL_NAME}-1280x720.jpg?t=${Date.now()}`;
        
        container.innerHTML = `
            <a href="https://twitch.tv/${CHANNEL_NAME}" target="_blank" class="stream-preview" 
               style="background-image: url('${thumbnailUrl}');">
                
                <div class="play-btn">
                    <i class="fas fa-play"></i>
                </div>
                
                <div class="watch-label">
                    Перейти на трансляцию <i class="fas fa-external-link-alt"></i>
                </div>
            </a>
        `;
    }
}

/* 
 * 5. Копирование в буфер обмена
 */
function copyToClipboard(text) {
    // Современный способ
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => showToast())
            .catch(() => fallbackCopy(text));
    } else {
        // Старый способ для совместимости
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const tempInput = document.createElement("textarea");
    tempInput.value = text;
    tempInput.style.position = "fixed";
    tempInput.style.opacity = "0";
    document.body.appendChild(tempInput);
    
    tempInput.focus();
    tempInput.select();
    
    try {
        document.execCommand('copy');
        showToast();
    } catch (err) {
        alert('Не удалось скопировать автоматически. Номер: ' + text);
    }
    
    document.body.removeChild(tempInput);
}

function showToast() {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;

    toast.classList.add("active");
    toast.innerHTML = '<i class="fas fa-check-circle" style="color: #22c55e; margin-right: 8px;"></i> Скопировано!';
    
    setTimeout(() => { 
        toast.classList.remove("active"); 
    }, 2500);
}