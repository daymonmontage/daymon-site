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
    const triggers = document.querySelectorAll('a, button, .s-btn, .donate-btn, .system-trigger, .nav-btn, .hud-btn, .inscryption-card:not(.locked)');
    triggers.forEach(el => {
        el.addEventListener('mouseenter', () => playSfx('hover'));
        el.addEventListener('mousedown', () => playSfx('click'));
    });

    // Делегирование звуков наведения и клика для динамического превью стрима (.stream-preview)
    document.addEventListener('mouseover', (e) => {
        const streamPrev = e.target.closest('.stream-preview');
        if (streamPrev) {
            const rel = e.relatedTarget;
            if (!rel || !streamPrev.contains(rel)) {
                playSfx('hover');
            }
        }
    });
    document.addEventListener('mousedown', (e) => {
        if (e.target.closest('.stream-preview')) {
            playSfx('click');
        }
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

// === CANVAS CONFETTI ===
export function startConfetti() {
    // Check if confetti canvas already exists to avoid duplication
    if (document.getElementById('confetti-canvas')) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '10006';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = ['#f97316', '#3b82f6', '#10b981', '#facc15', '#ec4899', '#a855f7'];
    const particleCount = 150;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height - height,
            r: Math.random() * 6 + 4,
            d: Math.random() * particleCount,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 5,
            tiltAngleIncremental: Math.random() * 0.07 + 0.02,
            tiltAngle: 0
        });
    }

    let animationId;
    const duration = 6000; // 6 seconds
    const startTime = Date.now();

    function draw() {
        ctx.clearRect(0, 0, width, height);

        let active = false;
        particles.forEach((p) => {
            p.tiltAngle += p.tiltAngleIncremental;
            p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
            p.x += Math.sin(p.tiltAngle);
            p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 15;

            if (p.y < height) {
                active = true;
            }

            ctx.beginPath();
            ctx.lineWidth = p.r;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
            ctx.stroke();
        });

        const elapsed = Date.now() - startTime;
        if (active && elapsed < duration) {
            animationId = requestAnimationFrame(draw);
        } else {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
            canvas.remove();
        }
    }

    draw();
}

// === BACKGROUND FIREWORKS ===
export function startBackgroundFireworks() {
    if (document.getElementById('bg-fireworks-canvas')) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'bg-fireworks-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-1'; 
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const fireworks = [];
    const particles = [];
    const colors = ['#f97316', '#3b82f6', '#10b981', '#facc15', '#ec4899', '#a855f7', '#ff4d4d'];

    class Firework {
        constructor() {
            this.x = Math.random() * width;
            this.y = height;
            this.tx = Math.random() * width;
            this.ty = Math.random() * (height * 0.6) + (height * 0.1); 
            this.speed = Math.random() * 2 + 3;
            this.angle = Math.atan2(this.ty - this.y, this.tx - this.x);
            this.dist = Math.hypot(this.tx - this.x, this.ty - this.y);
            this.distTraveled = 0;
        }
        update() {
            const vx = Math.cos(this.angle) * this.speed;
            const vy = Math.sin(this.angle) * this.speed;
            this.x += vx;
            this.y += vy;
            this.distTraveled += Math.hypot(vx, vy);

            if (this.distTraveled >= this.dist) {
                explode(this.tx, this.ty);
                return false;
            }
            return true;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#ffaa44';
            ctx.fill();
        }
    }

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.angle = Math.random() * Math.PI * 2;
            this.speed = Math.random() * 4 + 1.5;
            this.friction = 0.95;
            this.gravity = 0.06;
            this.alpha = 1;
            this.decay = Math.random() * 0.012 + 0.008;
        }
        update() {
            this.speed *= this.friction;
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed + this.gravity;
            this.alpha -= this.decay;
            return this.alpha > 0;
        }
        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.random() * 1.5 + 1, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 6;
            ctx.shadowColor = this.color;
            ctx.fill();
            ctx.restore();
        }
    }

    function explode(x, y) {
        const pCount = Math.floor(Math.random() * 15) + 20;
        const color = colors[Math.floor(Math.random() * colors.length)];
        for (let i = 0; i < pCount; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    let spawnTimer = 0;

    function loop() {
        ctx.clearRect(0, 0, width, height);

        spawnTimer++;
        if (spawnTimer > 80) { 
            if (fireworks.length < 3) {
                fireworks.push(new Firework());
            }
            spawnTimer = 0;
        }

        for (let i = fireworks.length - 1; i >= 0; i--) {
            if (!fireworks[i].update()) {
                fireworks.splice(i, 1);
            } else {
                fireworks[i].draw();
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            if (!particles[i].update()) {
                particles.splice(i, 1);
            } else {
                particles[i].draw();
            }
        }

        requestAnimationFrame(loop);
    }

    loop();
}