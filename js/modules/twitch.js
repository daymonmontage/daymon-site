import { CONFIG } from './config.js';

let GAMES_DATA = [];
const INITIAL_GAMES_DISPLAY = 8; 

export async function initClipsGallery() { 
    const container = document.getElementById('games-container');
    
    if (!container) return;

    try {
        const res = await fetch('assets/games.json?t=' + Date.now());
        if (!res.ok) throw new Error("Games JSON not found");
        GAMES_DATA = await res.json();
    } catch (err) {
        console.warn("Games load failed:", err);
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#ef4444;">Ошибка загрузки библиотеки игр.<br>Запустите update-games.py</div>';
        return;
    }

    container.innerHTML = '';

    // 1. Рендерим карточки игр
    GAMES_DATA.forEach((game, index) => {
        const card = document.createElement('div');
        card.className = `game-card ${index >= INITIAL_GAMES_DISPLAY ? 'hidden-game' : ''}`;
        card.onclick = () => openGameModal(game);

        card.innerHTML = `
            <img src="${game.art}" alt="${game.name}" class="game-cover" loading="lazy">
            <div class="game-info">
                <div class="game-title">${game.name}</div>
                <div class="game-meta">
                    <i class="fas fa-film"></i> ${game.count} клипов
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    // 2. Кнопка "Показать больше"
    if (GAMES_DATA.length > INITIAL_GAMES_DISPLAY) {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'gm-footer-controls';
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-clips-btn';
        toggleBtn.innerHTML = `Показать все (${GAMES_DATA.length}) <i class="fas fa-chevron-down"></i>`;
        
        let isExpanded = false;

        toggleBtn.onclick = () => {
            const hiddenGames = container.querySelectorAll('.game-card');
            
            if (!isExpanded) {
                hiddenGames.forEach(el => el.classList.remove('hidden-game'));
                toggleBtn.innerHTML = `Свернуть <i class="fas fa-chevron-up"></i>`;
                toggleBtn.classList.add('expanded');
                isExpanded = true;
            } else {
                hiddenGames.forEach((el, idx) => {
                    if (idx >= INITIAL_GAMES_DISPLAY) el.classList.add('hidden-game');
                });
                const sectionTop = container.closest('.content-card').offsetTop - 100;
                window.scrollTo({ top: sectionTop, behavior: 'smooth' });
                toggleBtn.innerHTML = `Показать все (${GAMES_DATA.length}) <i class="fas fa-chevron-down"></i>`;
                toggleBtn.classList.remove('expanded');
                isExpanded = false;
            }
        };

        controlsDiv.appendChild(toggleBtn);
        container.appendChild(controlsDiv);
    }

    setupGameModal();
}

function setupGameModal() {
    const modal = document.getElementById('game-gallery-modal');
    const closeBtn = document.getElementById('gm-close-btn');

    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.classList.remove('open');
            setTimeout(() => {
                document.getElementById('gm-clips-grid').innerHTML = '';
            }, 300); 
        };
    }

    modal.onclick = (e) => {
        if (e.target === modal) closeBtn.click();
    };
}

// === НОВАЯ ЛОГИКА: 3-COLUMN GRID IN SIDEBAR ===
function openGameModal(game) {
    const modal = document.getElementById('game-gallery-modal');
    const titleEl = document.getElementById('gm-game-title');
    const bodyEl = document.getElementById('gm-clips-grid');
    
    titleEl.textContent = game.name;
    bodyEl.innerHTML = ''; 
    modal.classList.add('open');

    const dom = ["daymonmontage.github.io", "itservicepgatk.github.io", "github.io", "localhost", "127.0.0.1"];
    let parents = "";
    dom.forEach(d => parents += `&parent=${d}`);

    // --- 1. ЛЕВАЯ КОЛОНКА (Плеер) ---
    const leftCol = document.createElement('div');
    leftCol.className = 'gm-left-col';

    const playerWrapper = document.createElement('div');
    playerWrapper.className = 'player-wrapper';
    const iframe = document.createElement('iframe');
    iframe.className = 'master-iframe';
    iframe.frameBorder = "0";
    iframe.allowFullscreen = true;
    iframe.scrolling = "no";
    
    // Берем первый клип (проверка на старый/новый формат)
    const firstClip = game.clips[0];
    const firstClipId = typeof firstClip === 'object' ? firstClip.id : firstClip;

    if (game.clips.length > 0) {
        iframe.src = `https://clips.twitch.tv/embed?clip=${firstClipId}${parents}&autoplay=true&muted=false`;
    }

    playerWrapper.appendChild(iframe);
    leftCol.appendChild(playerWrapper);

    // Панель настроек
    const controlsPanel = document.createElement('div');
    controlsPanel.className = 'player-controls-panel';
    
    controlsPanel.innerHTML = `
        <div class="controls-header">
            <div class="controls-title">Клипы: ${game.name}</div>
            <div class="sort-tabs">
                <button class="sort-btn active" data-sort="popular">Популярные</button>
                <button class="sort-btn" data-sort="random">Случайно</button>
                <button class="sort-btn" data-sort="reverse">С конца</button>
            </div>
        </div>
        <div class="clip-meta-info">
            <p><strong>Категория:</strong> ${game.name}</p>
            <p><strong>Всего клипов:</strong> ${game.count}</p>
        </div>
    `;
    leftCol.appendChild(controlsPanel);

    // --- 2. ПРАВАЯ КОЛОНКА (Сетка 3x) ---
    const rightCol = document.createElement('div');
    rightCol.className = 'gm-right-col';
    
    rightCol.innerHTML = `
        <div class="playlist-header">Очередь просмотра</div>
        <div class="playlist-scroll-area" id="playlist-area"></div>
    `;

    bodyEl.appendChild(leftCol);
    bodyEl.appendChild(rightCol);

    // --- ЛОГИКА РЕНДЕРА ---
    const playlistArea = rightCol.querySelector('#playlist-area');
    let currentClips = [...game.clips];

    const renderPlaylist = (clipsList) => {
        playlistArea.innerHTML = '';
        clipsList.forEach((clipData, index) => {
            const item = document.createElement('div');
            item.className = `playlist-item ${index === 0 ? 'active-clip' : ''}`;
            
            // Обработка данных (новый или старый JSON)
            let cId, cTitle, cThumb, cViews;
            
            if (typeof clipData === 'object') {
                cId = clipData.id;
                cTitle = clipData.title;
                cThumb = clipData.thumb;
                cViews = clipData.views;
            } else {
                // Fallback для старого JSON
                cId = clipData;
                cTitle = `Clip #${index + 1}`;
                cThumb = game.art; // Используем обложку игры
                cViews = '?';
            }

            // Форматирование просмотров (1.2k)
            const formattedViews = cViews > 1000 ? (cViews/1000).toFixed(1) + 'k' : cViews;

            item.innerHTML = `
                <div class="pl-thumb-mini" style="background-image: url('${cThumb}')">
                    <div class="pl-views-badge"><i class="fas fa-eye"></i> ${formattedViews}</div>
                </div>
                <div class="pl-info-mini">
                    <div class="pl-title-mini" title="${cTitle}">${cTitle}</div>
                    <div class="pl-meta-mini">by DaymonMontage</div>
                </div>
            `;

            item.onclick = () => {
                playlistArea.querySelectorAll('.playlist-item').forEach(el => el.classList.remove('active-clip'));
                item.classList.add('active-clip');
                iframe.src = `https://clips.twitch.tv/embed?clip=${cId}${parents}&autoplay=true&muted=false`;
                
                if (window.innerWidth < 1024) {
                    bodyEl.scrollTo({ top: 0, behavior: 'smooth' });
                }
            };
            playlistArea.appendChild(item);
        });
    };

    renderPlaylist(currentClips);

    // Сортировка
    const sortBtns = controlsPanel.querySelectorAll('.sort-btn');
    sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sortBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const type = btn.dataset.sort;
            if (type === 'popular') {
                // Если данные новые, сортируем по views, иначе по порядку
                if (typeof currentClips[0] === 'object') {
                    currentClips.sort((a, b) => b.views - a.views);
                } else {
                    currentClips = [...game.clips];
                }
            } else if (type === 'reverse') {
                currentClips.reverse();
            } else if (type === 'random') {
                currentClips.sort(() => Math.random() - 0.5);
            }
            
            renderPlaylist(currentClips);
            
            // Запуск первого
            const first = currentClips[0];
            const fId = typeof first === 'object' ? first.id : first;
            if (fId) {
                iframe.src = `https://clips.twitch.tv/embed?clip=${fId}${parents}&autoplay=true&muted=false`;
            }
        });
    });
}

export async function checkTwitchStatus() {
    const statusEl = document.getElementById('stream-status');
    const liveBox = document.getElementById('live-box');
    const streamTab = document.getElementById('stream-tab-btn');

    if (!statusEl) return;

    const ui = { icon: statusEl.querySelector('i'), text: statusEl.querySelector('.status-text') };
    const url = `https://api.codetabs.com/v1/proxy?quest=https://decapi.me/twitch/uptime/${CONFIG.CHANNEL_NAME}`;

    try {
        const res = await fetch(url);
        const data = await res.text();
        
        if (data.toLowerCase().includes('offline')) {
            // === OFFLINE ===
            ui.text.textContent = 'Offline';
            ui.icon.style.color = '#71717a';
            statusEl.classList.remove('online');
            
            if(liveBox) liveBox.style.display = 'none';
            
            if(streamTab) streamTab.style.display = 'none';
            
        } else {
            // === ONLINE ===
            ui.text.textContent = 'LIVE';
            statusEl.classList.add('online');
            
            if(liveBox) {
                liveBox.style.display = 'block';
                loadTwitchEmbed();
            }

            if(streamTab) {
                streamTab.style.display = 'block';
                streamTab.style.animation = 'slideInDown 0.5s ease';
            }
        }
    } catch (e) { 
        console.warn('Twitch API Error', e); 
    }
}

function loadTwitchEmbed() {
    const container = document.getElementById('twitch-embed');
    if (container && container.innerHTML === "") {
        const thumb = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${CONFIG.CHANNEL_NAME}-1280x720.jpg?t=${Date.now()}`;
        container.innerHTML = `
            <a href="https://twitch.tv/${CONFIG.CHANNEL_NAME}" target="_blank" class="stream-preview" style="background-image: url('${thumb}');">
                <div class="play-btn"><i class="fas fa-play"></i></div>
                <div class="watch-label">Перейти на трансляцию <i class="fas fa-external-link-alt"></i></div>
            </a>`;
    }
}