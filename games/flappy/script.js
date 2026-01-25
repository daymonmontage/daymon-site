// === CONFIG ===
const SUPABASE_URL = 'https://zddnfjnvplxutzjbpkwe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bBE_oWza0XdFBY-uIS6MAw_abtrIZRG';

// === ASSETS ===
// Игрок (Банка с крыльями)
const imgBirdFlap = new Image(); imgBirdFlap.src = 'assets/gorilla-flap.png';   // Крылья вниз
const imgBirdGlide = new Image(); imgBirdGlide.src = 'assets/gorilla-glide.png'; // Крылья вверх

// Трубы (Деймон)
const imgPipeTop = new Image(); imgPipeTop.src = 'assets/daymon-top.png';
const imgPipeBot = new Image(); imgPipeBot.src = 'assets/daymon-bottom.png';

const imgBg = new Image(); imgBg.src = 'assets/bg.png';
// === AUDIO ===
const sfxFlap = new Audio('assets/flap.wav'); sfxFlap.volume = 0.3;
const sfxScore = new Audio('assets/score.wav'); sfxScore.volume = 0.4;
const sfxHit = new Audio('assets/hit.wav'); sfxHit.volume = 0.5;

const bgMusic = new Audio('assets/music.wav'); 
bgMusic.loop = true; // Зацикливаем
bgMusic.volume = 0.3; // Громкость фона (тише эффектов)

// === GAME VARIABLES ===
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let frames = 0;
let score = 0;
let highScore = 0;
let gamePlaying = false;
let speed = 2.5;

// Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let currentUser = null;

// === RESIZE HANDLING ===
function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resize);
resize();

// === GAME OBJECTS ===
const bird = {
    x: 50,
    y: 150,
    w: 85, // Было 50 -> Стало 85 (Банка теперь крупная)
    h: 85, // Было 50 -> Стало 85
    velocity: 0,
    gravity: 0.25,
    jump: 4.6,
    
    draw: function() {
        let currentImg = (this.velocity < 0) ? imgBirdFlap : imgBirdGlide;

        if (currentImg.complete && currentImg.naturalWidth !== 0) {
            ctx.drawImage(currentImg, this.x, this.y, this.w, this.h);
        } else {
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
    },
    
    update: function() {
        if (gamePlaying) {
            this.velocity += this.gravity;
            this.y += this.velocity;
            
            if (this.y + this.h >= canvas.height || this.y < 0) {
                gameOver();
            }
        } else {
            this.y = 150 + Math.sin(frames * 0.05) * 10;
        }
    },
    
    flap: function() {
        this.velocity = -this.jump;
        sfxFlap.currentTime = 0;
        sfxFlap.play().catch(()=>{});
    }
};

const pipes = {
    items: [],
    w: 60, // Чуть шире трубы (было 55)
    gap: 220, // Увеличили зазор (было 170), чтобы большая банка пролезала
    dx: speed,
    
    draw: function() {
        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            
            // Верхняя труба
            if (imgPipeTop.complete && imgPipeTop.naturalWidth !== 0) {
                ctx.drawImage(imgPipeTop, p.x, p.y, this.w, p.h);
            } else {
                ctx.fillStyle = '#f97316';
                ctx.fillRect(p.x, p.y, this.w, p.h);
                ctx.fillStyle = '#000'; ctx.strokeRect(p.x, p.y, this.w, p.h);
            }
            
            // Нижняя труба
            let bottomY = p.y + p.h + this.gap;
            let bottomH = canvas.height - bottomY;
            
            if (imgPipeBot.complete && imgPipeBot.naturalWidth !== 0) {
                ctx.drawImage(imgPipeBot, p.x, bottomY, this.w, bottomH);
            } else {
                ctx.fillStyle = '#f97316';
                ctx.fillRect(p.x, bottomY, this.w, bottomH);
                ctx.fillStyle = '#000'; ctx.strokeRect(p.x, bottomY, this.w, bottomH);
            }
        }
    },
    
    update: function() {
        if (!gamePlaying) return;
        
        if (frames % 120 === 0) {
            let maxH = canvas.height - this.gap - 50;
            let h = Math.floor(Math.random() * (maxH - 50) + 50);
            this.items.push({ x: canvas.width, y: 0, h: h, passed: false });
        }
        
        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            p.x -= this.dx;
            
            // === КОЛЛИЗИЯ (ЩАДЯЩАЯ) ===
            let hitX = bird.x + 32;
            let hitY = bird.y + 45;
            let hitW = bird.w - 65;
            let hitH = bird.h - 55;

            if (hitX + hitW > p.x && hitX < p.x + this.w) {
                if (hitY < p.y + p.h || hitY + hitH > p.y + p.h + this.gap) {
                    gameOver();
                }
            }
            
            if (p.x + this.w < bird.x && !p.passed) {
                score++;
                document.getElementById('score').innerText = score;
                p.passed = true;
                
                // Звук очка
                sfxScore.currentTime = 0;
                sfxScore.play().catch(()=>{});

                if (score % 5 === 0) this.dx += 0.1;
            }
            
            if (p.x + this.w < 0) {
                this.items.shift();
                i--;
            }
        }
    }
};

const bg = {
    draw: function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
};

// === GAME LOOP ===
function loop() {
    bg.draw();
    pipes.draw();
    pipes.update();
    bird.draw();
    bird.update();
    
    // Управление анимацией фона через JS (остановка при смерти)
    const layers = document.querySelectorAll('.bg-layer');
    if (gamePlaying) {
        layers.forEach(l => l.style.animationPlayState = 'running');
    } else {
        // Если игра не идет, фон движется медленно (как заставка) или стоит
        // Оставим running для красоты меню, или paused для реализма
        layers.forEach(l => l.style.animationPlayState = 'running'); 
    }

    frames++;
    requestAnimationFrame(loop);
}

// === CONTROLS ===
function action() {
    if (!gamePlaying) return;
    bird.flap();
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault(); // Отключаем прокрутку и нажатие кнопок браузером
        action();
    }
});
canvas.addEventListener('click', action);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); action(); });

// === GAME STATE ===
function startGame() {
    // Снимаем фокус с любой нажатой кнопки, чтобы Пробел не нажимал её снова
    if (document.activeElement) {
        document.activeElement.blur();
    }

    gamePlaying = true;
    
    // ЗАПУСК МУЗЫКИ
    bgMusic.currentTime = 0;
    bgMusic.play().catch(()=>{});
    
    score = 0;
    frames = 0;
    pipes.items = [];
    pipes.dx = speed;
    bird.y = 150;
    bird.velocity = 0;
    
    document.getElementById('score').innerText = '0';
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('game-over-screen').classList.remove('active');
    
    // Запускаем анимацию фона
    const layers = document.querySelectorAll('.bg-layer');
    layers.forEach(l => l.style.animationPlayState = 'running');
}

function gameOver() {
    if (!gamePlaying) return;
    
    gamePlaying = false;
    sfxHit.play().catch(()=>{});
    
    // ОСТАНОВКА МУЗЫКИ
    bgMusic.pause();
    
    document.getElementById('final-score').innerText = score;
    document.getElementById('game-over-screen').classList.add('active');
    
    if (score > highScore) {
        highScore = score;
        document.getElementById('new-record-msg').style.display = 'block';
        saveHighscore(highScore);
    } else {
        document.getElementById('new-record-msg').style.display = 'none';
    }
    document.getElementById('final-best').innerText = highScore;
    document.getElementById('best-score').innerText = highScore;
}

// === SUPABASE ===
async function initAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        // Сразу обновляем имя и аватарку в базе при входе
        updateProfileOnLogin();
        loadHighscore();
    } else {
        document.getElementById('best-score').innerText = 'Гость';
    }
}

// Новая функция: Обновляет данные профиля при входе
async function updateProfileOnLogin() {
    if (!currentUser) return;

    // Пытаемся достать никнейм из разных полей (Discord иногда меняет структуру)
    const meta = currentUser.user_metadata;
    const userName = meta.full_name || meta.name || meta.preferred_username || currentUser.email.split('@')[0];
    const avatarUrl = meta.avatar_url || '';

    // Обновляем базу данных, даже если рекорд не побит
    await supabase
        .from('profiles')
        .update({ 
            username: userName,
            avatar_url: avatarUrl
        })
        .eq('id', currentUser.id);
}

async function loadHighscore() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('profiles')
        .select('flappy_highscore')
        .eq('id', currentUser.id)
        .single();
        
    if (data) {
        highScore = data.flappy_highscore || 0;
        document.getElementById('best-score').innerText = highScore;
    }
}

async function saveHighscore(newScore) {
    if (!currentUser) return;
    
    // Дублируем логику получения имени для надежности
    const meta = currentUser.user_metadata;
    const userName = meta.full_name || meta.name || meta.preferred_username || 'Player';
    const avatarUrl = meta.avatar_url || '';

    await supabase
        .from('profiles')
        .update({ 
            flappy_highscore: newScore,
            username: userName,
            avatar_url: avatarUrl
        })
        .eq('id', currentUser.id);
        
    console.log("New record saved:", newScore);
}

// === LEADERBOARD LOGIC ===
async function openLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    const screen = document.getElementById('leaderboard-screen');
    
    screen.classList.add('active');
    list.innerHTML = '<div style="text-align:center; margin-top:20px;">Загрузка...</div>';

    // Запрос ТОП-20 игроков
    const { data, error } = await supabase
        .from('profiles')
        .select('username, flappy_highscore, avatar_url')
        .gt('flappy_highscore', 0)
        .order('flappy_highscore', { ascending: false })
        .limit(20);

    if (error) {
        list.innerHTML = '<div style="color:red; text-align:center;">Ошибка загрузки</div>';
        console.error(error);
        return;
    }

    if (!data || data.length === 0) {
        list.innerHTML = '<div style="text-align:center; margin-top:20px;">Пока пусто...</div>';
        return;
    }

    // Рендер списка
    let html = '';
    data.forEach((player, index) => {
        const rank = index + 1;
        // Если имя пустое, пробуем fallback, но теперь оно должно быть заполнено
        const name = player.username || 'Неизвестный';
        const score = player.flappy_highscore;
        const avatar = player.avatar_url || '../assets/avatar.png';

        // Проверка: это я?
        let isMe = false;
        if (currentUser) {
            const myName = currentUser.user_metadata.full_name || currentUser.user_metadata.name;
            if (name === myName) isMe = true;
        }
        
        const style = isMe ? 'background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6;' : '';

        html += `
            <div class="lb-item" style="${style}">
                <div class="lb-left">
                    <span class="lb-rank">#${rank}</span>
                    <img src="${avatar}" class="lb-avatar" onerror="this.src='../assets/avatar.png'">
                    <span class="lb-name">${name}</span>
                </div>
                <span class="lb-score">${score}</span>
            </div>
        `;
    });

    list.innerHTML = html;
}

function closeLeaderboard() {
    document.getElementById('leaderboard-screen').classList.remove('active');
}

// === INIT ===
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

// Кнопки таблицы лидеров
document.getElementById('leaderboard-btn').addEventListener('click', openLeaderboard);
document.getElementById('leaderboard-btn-over').addEventListener('click', openLeaderboard);
document.getElementById('close-lb-btn').addEventListener('click', closeLeaderboard);

initAuth();
loop();