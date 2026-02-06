import { CONFIG, ACHIEVEMENT_DATA } from './config.js';
import { soundOut, soundComplete } from './utils.js';
import { saveToCloud, isUserLoggedIn } from './auth.js';

let achContainer = null;
const EARTH_ICON_URL = "https://cdn.modrinth.com/user/ug4niCpj/012027a682fa781055b26bdfa25e804fffebb48c.gif";

class Achievement {
    constructor(title, desc) {
        this.element = this.createDOM(title, desc);
        this.remainingTime = CONFIG.ACHIEVEMENT_TIME;
        this.timerId = null;
        this.startTime = null;
        this.isPaused = false;
        this.mount();
    }

    createDOM(title, desc) {
        const div = document.createElement('div');
        div.className = 'mc-achievement';
        div.innerHTML = `
            <div class="mc-icon" style="background-image: url('${EARTH_ICON_URL}')"></div>
            <div class="mc-content">
                <div class="mc-title">${title}</div>
                <div class="mc-desc">${desc}</div>
            </div>
        `;
        return div;
    }

    mount() {
        if (achContainer.children.length >= CONFIG.ACHIEVEMENT_MAX_STACK) {
            const oldest = achContainer.firstChild;
            if(oldest._instance) oldest._instance.destroy();
            else oldest.remove();
        }
        this.element._instance = this;
        achContainer.appendChild(this.element);
        requestAnimationFrame(() => {
            this.element.classList.add('show');
            this.startTimer();
        });
    }

    startTimer() {
        this.startTime = Date.now();
        this.isPaused = false;
        this.timerId = setTimeout(() => { this.destroy(); }, this.remainingTime);
    }

    pauseTimer() {
        if (this.isPaused) return;
        clearTimeout(this.timerId);
        const elapsed = Date.now() - this.startTime;
        this.remainingTime -= elapsed;
        this.isPaused = true;
    }

    resumeTimer() {
        if (!this.isPaused || this.remainingTime <= 0) return;
        this.startTimer();
    }

    destroy() {
        if (!this.element) return;
        this.element.classList.remove('show');
        this.element.classList.add('hide');
        setTimeout(() => {
            if (this.element && this.element.parentNode) this.element.remove();
            this.element = null;
        }, 300);
    }
}

function getUnlockedAchievements() {
    return JSON.parse(localStorage.getItem('unlocked_achievements')) || [];
}

function saveAchievement(key) {
    const unlocked = getUnlockedAchievements();

    if (!isUserLoggedIn && unlocked.length >= 5 && !unlocked.includes(key)) {
        showLimitToast();
        return false;
    }

    if (!unlocked.includes(key)) {
        unlocked.push(key);
        localStorage.setItem('unlocked_achievements', JSON.stringify(unlocked));
        saveToCloud(key);
        const dot = document.querySelector('.ach-notification-dot');
        if(dot) dot.classList.add('active');
        renderHistoryList();
        return true; 
    }
    return false; 
}

function showLimitToast() {
    const t = document.getElementById("toast-notification");
    if(t) { 
        t.classList.add("active"); 
        t.style.border = "1px solid #f97316";
        t.innerHTML = '<i class="fab fa-discord" style="color:#5865F2;margin-right:8px;"></i> <span style="font-size:0.9rem">Войдите через Discord, чтобы открыть больше 5 достижений!</span>'; 
        setTimeout(()=> {
            t.classList.remove("active");
            t.style.border = "";
        }, 4000); 
    }
}

function renderHistoryList() {
    const listEl = document.getElementById('ach-history-list');
    const statsEl = document.getElementById('ach-stats-display');
    if(!listEl) return;

    const unlocked = getUnlockedAchievements();
    const allKeys = Object.keys(ACHIEVEMENT_DATA);
    statsEl.textContent = `${unlocked.length}/${allKeys.length}`;
    listEl.innerHTML = '';

    if (!isUserLoggedIn && unlocked.length >= 5) {
        const limitBanner = document.createElement('div');
        limitBanner.className = 'ach-limit-banner';
        limitBanner.innerHTML = `
            <div class="limit-header">
                <div class="limit-icon-box"><i class="fas fa-lock"></i></div>
                <div class="limit-info">
                    <h4>Демо-режим</h4>
                    <p>Достигнут лимит (5/5). Авторизуйтесь, чтобы продолжить прогресс.</p>
                </div>
            </div>
            <button class="limit-auth-btn" onclick="document.getElementById('login-btn').click()">
                <i class="fab fa-discord"></i> Войти через Discord
            </button>
        `;
        listEl.appendChild(limitBanner);
        statsEl.style.color = "#ef4444";
        statsEl.textContent += " (MAX)";
    } else {
        statsEl.style.color = "#fff";
    }

    allKeys.forEach(key => {
        const isUnlocked = unlocked.includes(key);
        const data = ACHIEVEMENT_DATA[key];
        const item = document.createElement('div');
        item.className = `history-item ${isUnlocked ? 'unlocked' : 'locked'}`;
        const iconHtml = isUnlocked ? '<i class="fas fa-check"></i>' : '<i class="fas fa-lock"></i>';
        const titleHtml = isUnlocked ? data.title : "???";
        const descHtml = isUnlocked ? data.desc : "Заблокировано";
        item.innerHTML = `
            <div class="h-icon">${iconHtml}</div>
            <div class="h-content">
                <div class="h-title">${titleHtml}</div>
                <div class="h-desc">${descHtml}</div>
            </div>
        `;
        listEl.appendChild(item);
    });
}

export function unlockDirectAchievement(key) {
    if (ACHIEVEMENT_DATA[key]) {
        const isNew = saveAchievement(key);
        if (isNew) {
            const data = ACHIEVEMENT_DATA[key];
            soundComplete.currentTime = 0;
            soundComplete.play().catch(()=>{});
            new Achievement(data.title, data.desc);
        }
    }
}

export function triggerAchievement(el, soundType, preventDefault = false, event = null) {
    let keyFound = null;
    let data = { title: "Advancement Made", desc: "Clicked something" };
    for (let key in ACHIEVEMENT_DATA) {
        if (el.classList.contains(key)) {
            data = ACHIEVEMENT_DATA[key];
            keyFound = key;
            break;
        }
    }
    if (keyFound) {
        const isNew = saveAchievement(keyFound);
        if (isNew) {
            const audio = soundType === 'out' ? soundOut : soundComplete;
            audio.currentTime = 0;
            audio.play().catch(()=>{});
            new Achievement(data.title, data.desc);
        }
    }
    if (preventDefault && event && el.tagName === 'A') {
        event.preventDefault();
        setTimeout(() => {
            window.open(el.href, el.target || '_self');
        }, CONFIG.REDIRECT_DELAY);
    }
}

export function initAchievements() {
    achContainer = document.createElement('div');
    achContainer.id = 'ach-container';
    document.body.appendChild(achContainer);
    window.addEventListener('achievements_updated', () => { renderHistoryList(); });
    document.addEventListener('visibilitychange', () => {
        const isHidden = document.visibilityState === 'hidden';
        Array.from(achContainer.children).forEach(el => {
            if (el._instance) {
                isHidden ? el._instance.pauseTimer() : el._instance.resumeTimer();
            }
        });
    });
    const histBtn = document.getElementById('ach-history-trigger');
    const histPanel = document.getElementById('ach-history-panel');
    const dot = document.querySelector('.ach-notification-dot');
    if (histBtn && histPanel) {
        histBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            histPanel.classList.toggle('open');
            if (histPanel.classList.contains('open')) {
                dot.classList.remove('active');
                renderHistoryList();
                playSfx('hover'); 
            }
        });
        document.addEventListener('click', (e) => {
            if (histPanel.classList.contains('open') && !histPanel.contains(e.target) && !histBtn.contains(e.target)) {
                histPanel.classList.remove('open');
            }
        });
    }
    document.querySelectorAll('.s-btn').forEach(el => {
        el.addEventListener('click', (e) => triggerAchievement(el, 'out', true, e));
    });
    const supportSelectors = ['.donate-btn.da', '.plastic-card', '.inscryption-card'];
    supportSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.addEventListener('click', (e) => {
                if (el.classList.contains('locked')) return;
                const isLink = el.tagName === 'A';
                triggerAchievement(el, 'complete', isLink, e);
            });
        });
    });
    const streamPrev = document.querySelector('.stream-preview');
    if (streamPrev) {
        streamPrev.addEventListener('click', (e) => triggerAchievement(streamPrev, 'complete', true, e));
    }
    renderHistoryList();
}

function playSfx(type) {
    if (localStorage.getItem('sfx_muted') === 'true') return;
    const s = new Audio(type === 'click' ? 'assets/click.mp3' : 'assets/hover.mp3');
    s.volume = 0.2;
    s.play().catch(()=>{});
}