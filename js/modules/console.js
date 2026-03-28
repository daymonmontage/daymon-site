import { playSfx } from './utils.js';
import { getDonorsData, renderLiveDonors } from './donors.js';

let isConsoleRunning = false;
const BOOT_SEQUENCE = [
    { type: 'normal', text: 'Initializing DaymonOS v1.0.5...' },
    { type: 'warning', text: 'Checking core dependencies...' },
    { type: 'success', text: 'coconut.jpg loaded successfully. System stable.' },
    { type: 'success', text: 'Connection established: Vitebsk Server' },
    { type: 'normal', text: 'Loading assets... hero_left.png, cat.png' },
    { type: 'warning', text: 'WARNING: Ears protection recommended' },
    { type: 'normal', text: 'Detecting lifeforms...' },
    { type: 'success', text: 'User found: You' },
    { type: 'normal', text: 'Signal received: "Meow"' },
    { type: 'success', text: 'System ready. Waiting for input.' },
    { type: 'normal', text: 'Type "help" for commands' }
];

export function initConsole() {
    const cmdInput = document.getElementById('cmd-input');
    if(cmdInput) {
        cmdInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = cmdInput.value.trim().toLowerCase();
                const output = document.getElementById('console-output');
                if (cmd) {
                    const echo = document.createElement('div');
                    echo.className = 'cmd-echo';
                    echo.textContent = `user@daymon:~$ ${cmd}`;
                    output.appendChild(echo);
                    processCommand(cmd);
                }
                cmdInput.value = '';
                output.scrollTop = output.scrollHeight;
            }
        });
    }
}

export function toggleConsole() {
    const consolePanel = document.getElementById('votv-console');
    const cmdInput = document.getElementById('cmd-input');
    const consoleOutput = document.getElementById('console-output');
    const achBtn = document.getElementById('ach-history-trigger');

    consolePanel.classList.toggle('open');
    if (achBtn) achBtn.classList.toggle('moved-up');

    if (consolePanel.classList.contains('open')) {
        setTimeout(() => cmdInput.focus(), 100);
        if (!isConsoleRunning) {
            isConsoleRunning = true;
            consoleOutput.innerHTML = ''; 
            runLogSequence(0);
        }
    }
}

function runLogSequence(index) {
    if (index >= BOOT_SEQUENCE.length) return;
    const msg = BOOT_SEQUENCE[index];
    const delay = Math.random() * 600 + 100;
    setTimeout(() => {
        printToConsole(msg.text, msg.type);
        runLogSequence(index + 1);
    }, delay);
}

function printToConsole(text, type = 'normal') {
    const output = document.getElementById('console-output');
    const line = document.createElement('div');
    line.className = 'log-line';
    let colorStyle = 'color: #ccc;';
    if (type === 'success') colorStyle = 'color: #4ade80;';
    if (type === 'warning') colorStyle = 'color: #facc15;';
    if (type === 'error')   colorStyle = 'color: #ef4444;';
    if (type === 'system')  colorStyle = 'color: #3b82f6;';
    line.style = colorStyle;
    line.innerHTML = `<span style="opacity:0.5">[SYS]</span> ${text}`;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
}

function processCommand(cmd) {
    let res = '', type = 'normal';
    switch (cmd) {
        case 'help':
            printToConsole('=== COMMANDS ===', 'system');
            printToConsole('status     - Stream Status');
            printToConsole('teststream - Preview Live Layout');
            printToConsole('cat        - Meow?');
            printToConsole('coconut    - Core Dependency');
            printToConsole('secret     - ???');
            printToConsole('clear      - Clear');
            return;
        case 'coconut':
            res = 'CRITICAL WARNING: DO NOT DELETE COCONUT.JPG';
            type = 'error';
            playSfx('click');
            {
                const overlay = document.createElement('div');
                overlay.className = 'video-overlay';
                overlay.style.zIndex = '99999';
                overlay.innerHTML = `
                <div style="text-align: center;">
                    <img src="assets/coconut.jpg" style="max-width: 80vw; max-height: 80vh; border-radius: 12px; box-shadow: 0 0 50px #ef4444; animation: pulse 2s infinite;">
                    <p style="color: #ef4444; font-family: monospace; font-weight: bold; margin-top: 20px; font-size: 1.2rem; text-shadow: 0 0 10px #ef4444;">
                        Я ПОНЯТИЯ НЕ ИМЕЮ, КТО ЭТО ЗДЕСЬ ПОСТАВИЛ, НО Я НЕ МОГУ ЭТО УДАЛИТЬ, ИНАЧЕ САЙТ НЕ ЗАПУСТИТСЯ.
                    </p>
                </div>
            `;
                document.body.appendChild(overlay);
                overlay.onclick = () => overlay.remove();
            }
            break;
        case 'clear': document.getElementById('console-output').innerHTML = ''; return;
        case 'status':
            const live = document.querySelector('.stream-check').classList.contains('online');
            res = live ? "ONLINE (Pog)" : "OFFLINE (Sadge)"; type = live ? 'success' : 'error'; break;
        case 'cat': res = "MEOW MEOW MEOW"; playSfx('hover'); break;
        case 'secret':
            res = "Opening secure channel..."; type = 'system';
            setTimeout(()=>window.open('https://discord.gg/UtGPrFT2Es'),1000); break;
        case 'teststream': {
            const liveBox = document.getElementById('live-box');
            if (liveBox) {
                liveBox.style.display = 'block';
                const embed = document.getElementById('twitch-embed');
                if (embed && embed.innerHTML === "") {
                    embed.innerHTML = `<div style="width:100%;height:100%;background:#111;display:flex;align-items:center;justify-content:center;color:#555;font-weight:bold;letter-spacing:2px;">[ MOCK PLAYER ]</div>`;
                }
                let streamDonors = getDonorsData('stream');
                if (!streamDonors || streamDonors.length === 0) {
                    streamDonors = [
                        { name: "Пиво!", amount: "5000 RUB", type: "gold" },
                        { name: "Hell", amount: "300 RUB", type: "normal" },
                        { name: "Dester", amount: "50 RUB", type: "normal" }
                    ];
                }
                renderLiveDonors(streamDonors);
                res = "Live layout preview enabled.";
                type = 'success';
                setTimeout(() => liveBox.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
            }
            break;
        }
        default: res = `Unknown: "${cmd}". Try "help"`; type = 'error';
    }
    setTimeout(() => printToConsole(res, type), 200);
}