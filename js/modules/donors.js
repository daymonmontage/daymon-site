/*
 * TOP DONORS MODULE (Sorted List)
 * Loads data from assets/donors.json
 * Sorts by amount and renders in center panel
 */

import { setFloatingDonors } from './ui.js'; // <--- ИМПОРТ ФУНКЦИИ ФОНА

let DONORS_LIST = [];

export async function initDonorsBackground() {
    const container = document.getElementById('donors-list-container');
    if (!container) return;

    // 1. Загрузка данных
    try {
        const response = await fetch('assets/donors.json?t=' + Date.now());
        if (response.ok) {
            const rawData = await response.json();
            DONORS_LIST = processAndSortDonors(rawData);
            
            // Рендерим список в UI
            renderDonorsList(container);
            
            // Передаем данные в UI для фона (летающие ники)
            setFloatingDonors(DONORS_LIST); 
            
        } else {
            throw new Error("File not found");
        }
    } catch (e) {
        console.warn("[Donors] JSON load failed.", e);
        container.innerHTML = '<p style="color:#555; margin-top:20px;">Список пуст</p>';
    }
}

// Функция обработки и сортировки
function processAndSortDonors(data) {
    const processed = data.map(d => {
        // Убираем все кроме цифр и точки
        const cleanAmount = d.amount.replace(/[^0-9.]/g, '');
        const val = parseFloat(cleanAmount) || 0;
        return {
            ...d,
            value: val
        };
    });

    // Сортируем: Больше -> Меньше
    return processed.sort((a, b) => b.value - a.value);
}

function renderDonorsList(container) {
    container.innerHTML = '';

    DONORS_LIST.forEach((donor, index) => {
        const row = document.createElement('div');
        
        // Классы для топ-3
        let rankClass = '';
        if (index === 0) rankClass = 'rank-1';
        else if (index === 1) rankClass = 'rank-2';
        else if (index === 2) rankClass = 'rank-3';
        
        row.className = `donor-row ${rankClass}`;

        // === ДИНАМИЧЕСКИЕ СТИЛИ (Градиент размера и прозрачности) ===
        let size = Math.max(0.8, 1.1 - (index * 0.03)); 
        let opacity = Math.max(0.4, 1 - (index * 0.05));

        row.style.fontSize = `${size}rem`;
        row.style.opacity = opacity;

        // Контент
        row.innerHTML = `
            <span class="d-name">${donor.name}</span>
            <span class="d-amount">${donor.amount}</span>
        `;

        container.appendChild(row);
    });
}