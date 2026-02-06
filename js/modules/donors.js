import { setFloatingDonors } from './ui.js';
import { playSfx } from './utils.js';
let ALL_DONORS_DATA = {};
let currentTab = 'all_time';
const TITLES = {
    'all_time': 'ЛЕГЕНДЫ (ВСЕ ВРЕМЯ)',
    'year': 'ТОП ПОДДЕРЖКА (ГОД)',
    'month': 'ГЕРОИ МЕСЯЦА',
    'stream': 'ТЕКУЩИЙ СТРИМ'
};
export async function initDonorsBackground() {
    const container = document.getElementById('donors-list-container');
    const tabs = document.querySelectorAll('.d-tab');
    const titleEl = document.getElementById('donors-title');
    if (!container) return;
    // === ФУНКЦИЯ ДЛЯ ТЕСТА (ВЫЗЫВАТЬ ИЗ КОНСОЛИ) ===
    window.debugStreamEmpty = () => {
        // 1. Скроллим к блоку
        const panel = document.querySelector('.donors-center-panel');
        if(panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 2. Принудительно показываем кнопку (так как она скрыта по умолчанию)
        const streamTab = document.getElementById('stream-tab-btn');
        if(streamTab) streamTab.style.display = 'block';
        // 3. Переключаем таб визуально
        tabs.forEach(t => t.classList.remove('active'));
        if(streamTab) streamTab.classList.add('active');
        // 4. Меняем заголовок
        if(titleEl) titleEl.textContent = TITLES['stream'];
        // 5. Рендерим пустой список
        currentTab = 'stream';
        renderDonorsList(container, []); 
    };
    // ===============================================
    // Настройка кликов по табам
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const type = tab.dataset.tab;
            if (type === currentTab) return;
            // UI Update
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            playSfx('click');
            currentTab = type;
            // Update Title
            if(titleEl) {
                titleEl.style.opacity = 0;
                setTimeout(() => {
                    titleEl.textContent = TITLES[type];
                    titleEl.style.opacity = 1;
                }, 200);
            }
            renderDonorsList(container, ALL_DONORS_DATA[type] || []);
        });
    });
    try {
        // Загружаем JSON с 4 категориями
        const response = await fetch('assets/donors.json?t=' + Date.now());
        if (response.ok) {
            const rawData = await response.json();
            // Обрабатываем каждую категорию
            for (const key in rawData) {
                ALL_DONORS_DATA[key] = processAndSortDonors(rawData[key]);
            }
            // Рендер дефолтной вкладки (all_time)
            renderDonorsList(container, ALL_DONORS_DATA['all_time']);
            // Для летающего фона берем "All Time" как самых важных
            setFloatingDonors(ALL_DONORS_DATA['all_time']); 
        } else {
            throw new Error("File not found");
        }
    } catch (e) {
        container.innerHTML = '<p style="color:#555; margin-top:20px; font-size:0.8rem;">Данные недоступны</p>';
    }
}
function processAndSortDonors(data) {
    if (!Array.isArray(data)) return [];
    const filtered = data.filter(donor => {
        const name = donor.name ? donor.name.trim().toLowerCase() : '';
        return name !== 'аноним' && name !== 'anonymous' && name !== '';
    });
    const processed = filtered.map(d => {
        const cleanAmount = d.amount.replace(/[^0-9.]/g, '');
        const val = parseFloat(cleanAmount) || 0;
        return {
            ...d,
            value: val
        };
    });
    return processed.sort((a, b) => b.value - a.value);
}
function renderDonorsList(container, list) {
    container.style.opacity = 0;
    setTimeout(() => {
        container.innerHTML = '';
        // === СПЕЦИАЛЬНЫЙ ВИД ДЛЯ ПУСТОГО СТРИМА ===
        if (list.length === 0 && currentTab === 'stream') {
            container.innerHTML = `
                <div class="empty-wallet-state">
                    <i class="fas fa-wallet wallet-icon"></i>
                    <div class="fly-container"></div>
                    <span class="empty-text">ПОКА ПУСТО...</span>
                </div>
            `;
            container.style.opacity = 1;
            return;
        }
        if (list.length === 0) {
            container.innerHTML = '<p style="color:#555; margin-top:20px; font-size:0.8rem;">Список пуст</p>';
            container.style.opacity = 1;
            return;
        }
        list.forEach((donor, index) => {
            const row = document.createElement('div');
            let rankClass = '';
            if (index === 0) rankClass = 'rank-1';
            else if (index === 1) rankClass = 'rank-2';
            else if (index === 2) rankClass = 'rank-3';
            row.className = `donor-row ${rankClass}`;
            // Немного уменьшаем шрифт для длинных списков
            let size = 0.85; 
            if (index < 3) size = 0.95;
            row.style.fontSize = `${size}rem`;
            // Анимация появления
            row.style.animation = `slideInDown ${0.3 + (index * 0.05)}s ease-out`;
            row.innerHTML = `
                <span class="d-name">${index + 1}. ${donor.name}</span>
                <span class="d-amount">${donor.amount}</span>
            `;
            container.appendChild(row);
        });
        container.style.opacity = 1;
    }, 200);
}