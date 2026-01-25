// === SFX SYSTEM ===
const sfxHover = new Audio('assets/hover.mp3'); sfxHover.volume = 0.15;
const sfxClick = new Audio('assets/click.mp3'); sfxClick.volume = 0.25;

export const soundOut = new Audio('assets/out.mp3'); soundOut.volume = 0.1;
export const soundComplete = new Audio('assets/complete.mp3'); soundComplete.volume = 0.1;

// === MUSIC SYSTEM ===
export const bgMusic = new Audio('assets/bg-music.mp3');
bgMusic.loop = true; 
bgMusic.volume = 0.15; 

export function playSfx(type) {
    if (localStorage.getItem('sfx_muted') === 'true') return;
    
    const sound = type === 'hover' ? sfxHover : sfxClick;
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

export function initSoundTriggers() {
    setupSfxToggle();
    setupMusicToggle();
    setupGlobalTriggers();
}

function setupSfxToggle() {
    const sfxBtn = document.getElementById('sfx-toggle');
    if (sfxBtn) {
        const updateUI = () => {
            const isMuted = localStorage.getItem('sfx_muted') === 'true';
            if (isMuted) sfxBtn.classList.add('muted');
            else sfxBtn.classList.remove('muted');
        };
        
        sfxBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isMuted = localStorage.getItem('sfx_muted') === 'true';
            localStorage.setItem('sfx_muted', !isMuted);
            if (!isMuted) playSfx('click');
            updateUI();
        });
        updateUI();
    }
}

function setupMusicToggle() {
    const musicBtn = document.getElementById('music-toggle');
    if (!musicBtn) return;

    let isMusicPlaying = localStorage.getItem('music_playing') !== 'false';

    const updateMusicUI = () => {
        if (isMusicPlaying) {
            musicBtn.classList.remove('muted');
            musicBtn.style.borderColor = '#f97316'; 
            musicBtn.style.color = '#f97316';
        } else {
            musicBtn.classList.add('muted');
            musicBtn.style.borderColor = '';
            musicBtn.style.color = '';
        }
    };

    const playMusic = () => {
        bgMusic.play().then(() => {
            isMusicPlaying = true;
            localStorage.setItem('music_playing', 'true');
            updateMusicUI();
        }).catch(() => {
            console.log("Music autoplay blocked/interrupted");
        });
    };

    const pauseMusic = () => {
        bgMusic.pause();
        isMusicPlaying = false;
        localStorage.setItem('music_playing', 'false');
        updateMusicUI();
    };

    musicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isMusicPlaying) {
            pauseMusic();
        } else {
            playMusic();
            playSfx('click');
        }
    });

    updateMusicUI();
    
    if (isMusicPlaying) {
        const startPromise = bgMusic.play();
        if (startPromise !== undefined) {
            startPromise.catch(() => {
                
                // Функция попытки запуска (сработает на любое действие)
                const tryStartMusic = () => {
                    if (localStorage.getItem('music_playing') !== 'false') {
                        bgMusic.play().then(() => {
                            // Если успешно запустилось — удаляем все слушатели
                            updateMusicUI();
                            document.removeEventListener('click', tryStartMusic);
                            document.removeEventListener('mousemove', tryStartMusic);
                            document.removeEventListener('keydown', tryStartMusic);
                            document.removeEventListener('touchstart', tryStartMusic);
                        }).catch(() => {
                            // Если браузер заблокировал (например, на mousemove),
                            // ничего не делаем, слушатели остаются висеть до следующего события
                        });
                    }
                };

                // Вешаем ловушки на всё подряд
                document.addEventListener('click', tryStartMusic);
                document.addEventListener('mousemove', tryStartMusic);
                document.addEventListener('keydown', tryStartMusic);
                document.addEventListener('touchstart', tryStartMusic);
            });
        }
    }
}

function setupGlobalTriggers() {
    const triggers = document.querySelectorAll('a, button, .s-btn, .donate-btn, .plastic-card, .system-trigger, .nav-btn, .stream-preview, .hud-btn, .inscryption-card:not(.locked)');
    triggers.forEach(el => {
        el.addEventListener('mouseenter', () => playSfx('hover'));
        el.addEventListener('mousedown', () => playSfx('click'));
    });
}

// === CLIPBOARD ===
export function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(showToast).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const el = document.createElement("textarea");
    el.value = text; el.style.position="fixed"; el.style.opacity="0";
    document.body.appendChild(el); el.focus(); el.select();
    try { document.execCommand('copy'); showToast(); } catch (e) {}
    document.body.removeChild(el);
}

function showToast() {
    const t = document.getElementById("toast-notification");
    if(t) { 
        t.classList.add("active"); 
        t.innerHTML = '<i class="fas fa-check-circle" style="color:#22c55e;margin-right:8px;"></i> Скопировано!'; 
        setTimeout(()=>t.classList.remove("active"),2500); 
    }
}