import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const jpg = fs.readFileSync(path.join(root, 'assets', 'coconut.jpg'));
const dataUrl = 'data:image/jpeg;base64,' + jpg.toString('base64');

const main = `import { setupUI } from './modules/ui.js';
import { initSoundTriggers, copyToClipboard } from './modules/utils.js';
import { initConsole, toggleConsole } from './modules/console.js';
import { checkTwitchStatus, initClipsGallery } from './modules/twitch.js';
import { initSecrets } from './modules/secrets.js';
import { initAchievements } from './modules/achievements.js';
import { initDonorsBackground } from './modules/donors.js';
import { initAuth } from './modules/auth.js';

window.copyToClipboard = copyToClipboard;
window.toggleConsole = toggleConsole;

document.addEventListener('DOMContentLoaded', () => {
    console.log(\`%c DAYMON HUB %c SYSTEM ONLINE \\n\`, 
        'background: #f97316; color: #000; padding: 4px; font-weight: bold;', 
        'color: #f97316;'
    );

    const coconutBase64 = ${JSON.stringify(dataUrl)};

    const coconutLogStyle =[
        "font-size: 1px;",
        "padding: 150px 200px;",
        \`background-image: url("\${coconutBase64}");\`,
        "background-size: contain;",
        "background-repeat: no-repeat;",
        "background-position: center;",
        "color: transparent;"
    ].join(" ");
    
    console.log("%c+", coconutLogStyle);
    
    console.log(
        "%c⚠️ КРИТИЧЕСКАЯ ЗАВИСИМОСТЬ: Весь исходный код этого сайта держится на файле coconut.jpg. Я не знаю почему, но если его удалить, сайт перестает работать. НЕ ТРОГАТЬ!", 
        "color: #ef4444; font-size: 14px; font-weight: bold; font-family: 'Courier New', monospace;"
    );

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
`;

fs.writeFileSync(path.join(root, 'js', 'main.js'), main, 'utf8');
console.log('main.js written, length', main.length);
