/*
 * DaymonMontage Hub Logic
 * Modular Entry Point
 */

import { setupUI } from './modules/ui.js';
import { initSoundTriggers, copyToClipboard } from './modules/utils.js';
import { initConsole, toggleConsole } from './modules/console.js';
import { checkTwitchStatus, initClipsGallery } from './modules/twitch.js';
import { initSecrets } from './modules/secrets.js';
import { initAchievements } from './modules/achievements.js';
import { initDonorsBackground } from './modules/donors.js';
import { initAuth } from './modules/auth.js'; // <--- ИМПОРТ

// Делаем функции глобальными
window.copyToClipboard = copyToClipboard;
window.toggleConsole = toggleConsole;

document.addEventListener('DOMContentLoaded', () => {
    console.log(`%c DAYMON HUB %c SYSTEM ONLINE \n`, 
        'background: #f97316; color: #000; padding: 4px; font-weight: bold;', 
        'color: #f97316;'
    );

    // Инициализация модулей
    setupUI();
    initSoundTriggers();
    initConsole();
    checkTwitchStatus();
    initClipsGallery();
    initSecrets();
    initAchievements();
    initDonorsBackground();
    initAuth();
});