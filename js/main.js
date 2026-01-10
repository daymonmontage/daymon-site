/*
 * DaymonMontage Hub Logic
 * Developer: Torgovets
 * 2026
 */

const CHANNEL_NAME = 'daymonmontage';
const TILT_FORCE = 3; 

const ALLOWED_HOSTS = [
    "daymonmontage.github.io",
    "itservicepgatk.github.io",
    "github.io",
    "localhost",
    "127.0.0.1",
    "0.0.0.0"
];

// Теперь это переменная, которая заполнится автоматически или запасными данными
let BEST_CLIPS = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log(`%c DAYMON HUB %c SYSTEM ONLINE \n`, 
        'background: #f97316; color: #000; padding: 4px; font-weight: bold;', 
        'color: #f97316;'
    );

    setupTiltEffect();
    renderSpaceBackground();
    setupEasterEgg();
    checkTwitchStatus();
    initClipsGallery();
    setupSoundTriggers();
});

// Прелоадер
window.addEventListener('load', () => {
    const loader = document.getElementById('preloader');
    if (loader) {
        setTimeout(() => loader.classList.add('finished'), 600);
    }
});

/* 3D Tilt Effect */
function setupTiltEffect() {
    const cards = document.querySelectorAll('.tilt-effect');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const rx = ((y - cy) / cy) * -TILT_FORCE; 
            const ry = ((x - cx) / cx) * TILT_FORCE;
            card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.01)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });
}

/* Space Background */
function renderSpaceBackground() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-2;pointer-events:none;';
    document.body.appendChild(canvas);

    let width, height, stars = [];
    const resize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    
    const initStars = () => {
        stars = [];
        for (let i = 0; i < 90; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.5 + 0.1
            });
        }
    };

    const animate = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        stars.forEach(s => {
            s.y -= s.speed;
            if (s.y < 0) { s.y = height; s.x = Math.random() * width; }
            ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
        });
        requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize(); initStars(); animate();
}

/* Easter Egg (Avatar Click) */
function setupEasterEgg() {
    const avatar = document.querySelector('.avatar-container img');
    if (!avatar) return;
    
    const sound = new Audio('assets/avatar_click.mp3'); 
    sound.volume = 0.4;

    avatar.addEventListener('click', () => {
        avatar.style.transition = '0.1s';
        avatar.style.transform = 'scale(1.1) rotate(15deg)';
        
        if (localStorage.getItem('sfx_muted') !== 'true') {
            sound.currentTime = 0;
            sound.play().catch(()=>{});
        }

        setTimeout(() => { avatar.style.transform = 'scale(1.1) rotate(-15deg)'; }, 100);
        setTimeout(() => { 
            avatar.style.transition = '0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            avatar.style.transform = 'scale(1) rotate(0deg)'; 
        }, 300);
    });
}

/* Twitch Status */
async function checkTwitchStatus() {
    const statusEl = document.getElementById('stream-status');
    const liveBox = document.getElementById('live-box');
    if (!statusEl) return;

    const ui = { icon: statusEl.querySelector('i'), text: statusEl.querySelector('.status-text') };
    const url = `https://api.codetabs.com/v1/proxy?quest=https://decapi.me/twitch/uptime/${CHANNEL_NAME}`;

    try {
        const res = await fetch(url);
        const data = await res.text();
        if (data.toLowerCase().includes('offline')) {
            ui.text.textContent = 'Offline';
            ui.icon.style.color = '#71717a';
            statusEl.classList.remove('online');
            if(liveBox) liveBox.style.display = 'none';
        } else {
            ui.text.textContent = 'LIVE';
            statusEl.classList.add('online');
            if(liveBox) {
                liveBox.style.display = 'block';
                loadTwitchEmbed();
            }
        }
    } catch (e) { console.warn('API Error'); }
}

function loadTwitchEmbed() {
    const container = document.getElementById('twitch-embed');
    if (container && container.innerHTML === "") {
        const thumb = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${CHANNEL_NAME}-1280x720.jpg?t=${Date.now()}`;
        container.innerHTML = `
            <a href="https://twitch.tv/${CHANNEL_NAME}" target="_blank" class="stream-preview" style="background-image: url('${thumb}');">
                <div class="play-btn"><i class="fas fa-play"></i></div>
                <div class="watch-label">Перейти на трансляцию <i class="fas fa-external-link-alt"></i></div>
            </a>`;
    }
}

/* Clipboard */
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(showToast).catch(() => fallbackCopy(text));
    } else fallbackCopy(text);
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
    if(t) { t.classList.add("active"); t.innerHTML = '<i class="fas fa-check-circle" style="color:#22c55e;margin-right:8px;"></i> Скопировано!'; setTimeout(()=>t.classList.remove("active"),2500); }
}

/* Clips Gallery (Auto-Load + Top Popular Backup) */
let clipIdx = 0;

async function initClipsGallery() {
    const container = document.getElementById('clip-container');
    const prev = document.getElementById('prev-clip');
    const next = document.getElementById('next-clip');
    const total = document.getElementById('clip-total');
    const curr = document.getElementById('clip-current');
    
    if (!container) return;

    try {
        const res = await fetch('assets/clips.json?t=' + Date.now());
        if (!res.ok) throw new Error("JSON Fetch failed");
        BEST_CLIPS = await res.json();
        console.log("Clips loaded from Cloud:", BEST_CLIPS.length);
    } catch (err) {
        console.warn("Cloud load failed, using local TOP backup:", err);
        
        BEST_CLIPS = [
            "SteamyGorgeousLardWOOP-OT__Q0C6jfeiYHyM",
            "ZealousSpikyDugongTheTarFu-601YmEiXj-qjxB8t",
            "BigExcitedDiscPlanking-E1a3x7Aph1G59UK9",
            "MotionlessStrongWrenRiPepperonis-hiVAoVs-Drf__LcT",
            "FastWiseCrabsPogChamp-CiTjXyaR7M_cfaLr",
            "SpineyPreciousClintmullinsUWot-Fk8Zer8ZJbM7_Vun"
        ];
    }

    if (!BEST_CLIPS || BEST_CLIPS.length === 0) {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#71717a;">Архив недоступен</div>';
        return;
    }
    total.textContent = BEST_CLIPS.length;

    const load = (i) => {
        const id = BEST_CLIPS[i];
        const dom = ["daymonmontage.github.io", "itservicepgatk.github.io", "github.io", "localhost", "127.0.0.1"];
        let parents = "";
        dom.forEach(d => parents += `&parent=${d}`);
        
        container.innerHTML = `<iframe src="https://clips.twitch.tv/embed?clip=${id}${parents}&autoplay=false&muted=false" height="100%" width="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>`;
        curr.textContent = i + 1;
    };
    
    load(clipIdx);

    prev.addEventListener('click', () => { 
        clipIdx--; 
        if(clipIdx < 0) clipIdx = BEST_CLIPS.length - 1; 
        load(clipIdx); 
    });
    
    next.addEventListener('click', () => { 
        clipIdx++; 
        if(clipIdx >= BEST_CLIPS.length) clipIdx = 0; 
        load(clipIdx); 
    });
}

/* Console System */
const consolePanel = document.getElementById('votv-console');
const consoleOutput = document.getElementById('console-output');
const cmdInput = document.getElementById('cmd-input');
let isConsoleRunning = false;

const BOOT_SEQUENCE = [
    { type: 'normal', text: 'Initializing DaymonOS v1.0.5...' },
    { type: 'success', text: 'Connection established: Vitebsk Server' },
    { type: 'normal', text: 'Loading assets... hero_left.png, cat.png' },
    { type: 'warning', text: 'WARNING: Ears protection recommended' },
    { type: 'normal', text: 'Detecting lifeforms...' },
    { type: 'success', text: 'User found: You' },
    { type: 'normal', text: 'Scanning signals...' },
    { type: 'normal', text: 'Signal received: "Meow"' },
    { type: 'success', text: 'System ready. Waiting for input.' },
    { type: 'normal', text: 'Type "help" for commands' }
];

function toggleConsole() {
    consolePanel.classList.toggle('open');
    if (consolePanel.classList.contains('open')) {
        setTimeout(() => cmdInput.focus(), 100);
        if (!isConsoleRunning) {
            isConsoleRunning = true;
            consoleOutput.innerHTML = ''; 
            runLogSequence(0);
        }
    }
}

function runLogSequence(index) {
    if (index >= BOOT_SEQUENCE.length) return;
    const msg = BOOT_SEQUENCE[index];
    const delay = Math.random() * 600 + 100;
    setTimeout(() => {
        printToConsole(msg.text, msg.type);
        runLogSequence(index + 1);
    }, delay);
}

function printToConsole(text, type = 'normal') {
    const line = document.createElement('div');
    line.className = 'log-line';
    let colorStyle = 'color: #ccc;';
    if (type === 'success') colorStyle = 'color: #4ade80;';
    if (type === 'warning') colorStyle = 'color: #facc15;';
    if (type === 'error')   colorStyle = 'color: #ef4444;';
    if (type === 'system')  colorStyle = 'color: #3b82f6;';
    line.style = colorStyle;
    line.innerHTML = `<span style="opacity:0.5">[SYS]</span> ${text}`;
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

if(cmdInput) {
    cmdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const cmd = cmdInput.value.trim().toLowerCase();
            if (cmd) {
                const echo = document.createElement('div');
                echo.className = 'cmd-echo';
                echo.textContent = `user@daymon:~$ ${cmd}`;
                consoleOutput.appendChild(echo);
                processCommand(cmd);
            }
            cmdInput.value = '';
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
    });
}

function processCommand(cmd) {
    let res = '', type = 'normal';
    switch (cmd) {
        case 'help':
            printToConsole('=== COMMANDS ===', 'system');
            printToConsole('status  - Stream Status');
            printToConsole('cat     - Meow?');
            printToConsole('secret  - ???');
            printToConsole('clear   - Clear');
            return;
        case 'clear': consoleOutput.innerHTML = ''; return;
        case 'status':
            const live = document.querySelector('.stream-check').classList.contains('online');
            res = live ? "ONLINE (Pog)" : "OFFLINE (Sadge)"; type = live ? 'success' : 'error'; break;
        case 'cat': res = "MEOW MEOW MEOW"; playSfx('hover'); break;
        case 'secret':
            res = "Opening secure channel..."; type = 'system';
            setTimeout(()=>window.open('https://discord.gg/UtGPrFT2Es'),1000); break;
        default: res = `Unknown: "${cmd}". Try "help"`; type = 'error';
    }
    setTimeout(() => printToConsole(res, type), 200);
}

/* SFX System */
const sfxBtn = document.getElementById('sfx-toggle');
let sfxMuted = localStorage.getItem('sfx_muted') === 'true';

const sfxHover = new Audio('assets/hover.mp3'); sfxHover.volume = 0.15;
const sfxClick = new Audio('assets/click.mp3'); sfxClick.volume = 0.25;

function playSfx(type) {
    if (sfxMuted) return;
    const sound = type === 'hover' ? sfxHover : sfxClick;
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

function toggleSfx(e) {
    if(e) e.stopPropagation();
    sfxMuted = !sfxMuted;
    localStorage.setItem('sfx_muted', sfxMuted);
    if (!sfxMuted) playSfx('click');
    updateSfxUI();
}

function updateSfxUI() {
    if(!sfxBtn) return;
    if (sfxMuted) sfxBtn.classList.add('muted');
    else sfxBtn.classList.remove('muted');
}

function setupSoundTriggers() {
    if (sfxBtn) sfxBtn.addEventListener('click', toggleSfx);
    updateSfxUI();

    const triggers = document.querySelectorAll('a, button, .s-btn, .donate-btn, .plastic-card, .system-trigger, .nav-btn, .stream-preview, .hud-btn');
    triggers.forEach(el => {
        el.addEventListener('mouseenter', () => playSfx('hover'));
        el.addEventListener('mousedown', () => playSfx('click'));
    });
}

/* 
 * KEYBOARD SECRETS (Typing on keyboard)
 * Просто печатай коды на клавиатуре в любом месте сайта
 */
const SECRET_CODES = {
    'meow':   { type: 'video', src: 'assets/cat-piano.mp4' },
    'monica':  { type: 'image-peek', src: 'assets/monica.png' },
    'daymon': { type: 'barrel-roll' }
};
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