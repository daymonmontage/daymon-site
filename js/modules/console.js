import { playSfx } from './utils.js';

let isConsoleRunning = false;
const BOOT_SEQUENCE = [
    { type: 'normal', text: 'Initializing DaymonOS v1.0.5...' },
    { type: 'success', text: 'Connection established: Vitebsk Server' },
    { type: 'normal', text: 'Loading assets... hero_left.png, cat.png' },
    { type: 'warning', text: 'WARNING: Ears protection recommended' },
    { type: 'normal', text: 'Detecting lifeforms...' },
    { type: 'success', text: 'User found: You' },
    { type: 'normal', text: 'Scanning signals...' },
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
            printToConsole('status  - Stream Status');
            printToConsole('cat     - Meow?');
            printToConsole('secret  - ???');
            printToConsole('clear   - Clear');
            return;
        case 'clear': document.getElementById('console-output').innerHTML = ''; return;
        case 'status':
            const live = document.querySelector('.stream-check').classList.contains('online');
            res = live ? "ONLINE (Pog)" : "OFFLINE (Sadge)"; type = live ? 'success' : 'error'; break;
        case 'cat': res = "MEOW MEOW MEOW"; playSfx('hover'); break;
        case 'secret':
            res = "Opening secure channel..."; type = 'system';
            setTimeout(()=>window.open('https://discord.gg/UtGPrFT2Es'),1000); break;
        default: res = `Unknown: "${cmd}". Try "help"`; type = 'error';
    }
    setTimeout(() => printToConsole(res, type), 200);
}