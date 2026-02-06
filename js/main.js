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