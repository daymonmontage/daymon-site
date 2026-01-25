const SUPABASE_URL = 'https://zddnfjnvplxutzjbpkwe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bBE_oWza0XdFBY-uIS6MAw_abtrIZRG';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("ARCADE SYSTEM ONLINE");
    
    // Инициализация Supabase
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Элементы блокировки
    const lockScreen = document.getElementById('auth-lock-screen');
    const overlayLoginBtn = document.getElementById('overlay-login-btn');

    // Логика кнопки входа на оверлее
    if (overlayLoginBtn) {
        overlayLoginBtn.addEventListener('click', async () => {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    redirectTo: window.location.href // Возврат на эту же страницу
                }
            });
            if (error) console.error("Login failed:", error);
        });
    }

    // Проверка сессии
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // Пользователь вошел - скрываем блокировку
        if (lockScreen) lockScreen.classList.remove('active');
        setupLoggedInState(session.user);
    } else {
        // Гость - показываем блокировку
        console.log("Access Denied: Guest User");
        if (lockScreen) lockScreen.classList.add('active');
    }

    setupEffects();
    loadFlappyTop3(supabase);
    setupLeaderboardModal(supabase);
});

function setupLoggedInState(user) {
    const authUi = document.getElementById('auth-ui');
    const nameEl = authUi.querySelector('.player-name');
    const avatarEl = authUi.querySelector('.player-avatar');
    const creditsEl = document.getElementById('credits-val');

    authUi.classList.remove('guest');
    authUi.classList.add('logged-in');
    
    // Безопасное получение имени
    const meta = user.user_metadata;
    const userName = meta.full_name || meta.name || meta.preferred_username || user.email.split('@')[0];
    const avatarUrl = meta.avatar_url;

    nameEl.textContent = userName.toUpperCase();
    
    if (avatarUrl) {
        avatarEl.innerHTML = `<img src="${avatarUrl}" alt="P1">`;
    }

    creditsEl.textContent = "CREDITS: ∞";
    console.log("System Unlocked for:", userName);
}

function unlockGames() {
    console.log("Games unlocked");
}

function setupEffects() {
    const cards = document.querySelectorAll('.game-card');
    const hoverSound = new Audio('../assets/hover.mp3'); 
    hoverSound.volume = 0.1;

    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            hoverSound.currentTime = 0;
            hoverSound.play().catch(()=>{});
        });
    });

    const title = document.querySelector('.neon-title');
    setInterval(() => {
        if(Math.random() > 0.95) {
            title.style.transform = `translate(${Math.random()*4-2}px, ${Math.random()*4-2}px)`;
            setTimeout(() => title.style.transform = 'none', 50);
        }
    }, 100);
}

// === ЗАГРУЗКА ТОП-3 (ДЛЯ КАРТОЧКИ) ===
async function loadFlappyTop3(supabase) {
    const container = document.querySelector('#flappy-top-3 .ml-list');
    if (!container) return;

    const { data, error } = await supabase
        .from('profiles')
        .select('username, flappy_highscore, avatar_url')
        .gt('flappy_highscore', 0)
        .order('flappy_highscore', { ascending: false })
        .limit(3);

    if (error || !data || data.length === 0) {
        container.innerHTML = '<div class="ml-loading">Нет данных</div>';
        return;
    }

    let html = '';
    data.forEach((player, index) => {
        const rank = index + 1;
        const name = player.username || 'Аноним';
        const score = player.flappy_highscore;
        const avatar = player.avatar_url || '../assets/avatar.png';

        html += `
            <div class="ml-row">
                <div class="ml-left">
                    <span class="ml-rank r-${rank}">#${rank}</span>
                    <img src="${avatar}" class="ml-avatar" onerror="this.src='../assets/avatar.png'">
                    <span class="ml-name">${name}</span>
                </div>
                <span class="ml-score">${score}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

// === МОДАЛЬНОЕ ОКНО С ПОЛНЫМ СПИСКОМ ===
function setupLeaderboardModal(supabase) {
    const openBtn = document.getElementById('open-hub-lb');
    const closeBtn = document.getElementById('close-hub-lb');
    const modal = document.getElementById('hub-lb-modal');
    const listContainer = document.getElementById('hub-full-list');

    if (!openBtn || !modal) return;

    openBtn.addEventListener('click', async () => {
        modal.classList.add('active');
        listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">Загрузка данных...</div>';

        // Загружаем ТОП-50
        const { data, error } = await supabase
            .from('profiles')
            .select('username, flappy_highscore, avatar_url')
            .gt('flappy_highscore', 0)
            .order('flappy_highscore', { ascending: false })
            .limit(50);

        if (error) {
            listContainer.innerHTML = '<div style="text-align:center; color:red;">Ошибка сети</div>';
            return;
        }

        if (!data || data.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding:20px;">Список пуст</div>';
            return;
        }

        let html = '';
        data.forEach((player, index) => {
            const rank = index + 1;
            const name = player.username || 'Аноним';
            const score = player.flappy_highscore;
            const avatar = player.avatar_url || '../assets/avatar.png';

            html += `
                <div class="lb-full-row">
                    <div class="lb-full-left">
                        <span class="lb-full-rank">#${rank}</span>
                        <img src="${avatar}" class="lb-full-avatar" onerror="this.src='../assets/avatar.png'">
                        <span class="lb-full-name">${name}</span>
                    </div>
                    <span class="lb-full-score">${score}</span>
                </div>
            `;
        });

        listContainer.innerHTML = html;
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // Закрытие по клику вне окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
}