import { playSfx } from './utils.js';
import { getDonorsData, renderLiveDonors } from './donors.js';
import { unlockDirectAchievement } from './achievements.js';

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
            printToConsole('hack       - Hack the Pentagon');
            printToConsole('clear      - Clear');
            return;
        case 'coconut':
            unlockDirectAchievement('secret-coconut');
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
        case 'hack': {
            startHackerAttack();
            res = "Hacking protocols initialized. Check your screen.";
            type = 'warning';
            break;
        }
        default: res = `Unknown: "${cmd}". Try "help"`; type = 'error';
    }
    setTimeout(() => printToConsole(res, type), 200);
}

const HACKER_LOGS = [
    "ssh root@pentagon.gov -p 22",
    "Connecting to mainframe 104.22.4.11...",
    "Bypassing firewall v4.21... [SUCCESS]",
    "Exploiting vulnerability CVE-2026-9999...",
    "Injecting payload: payload.bin...",
    "Decryption key [A9F8-B920-C911] found",
    "Downloading launch_codes.xml...",
    "Accessing database nucleardb_v9...",
    "Deleting server logs to erase traces...",
    "Overclocking mainframes to 4.8 GHz...",
    "NSA satellite tracking bypassed...",
    "Sending brute force package: 100,000 req/sec",
    "Root access granted to mainframe 3",
    "Decrypting file: daymon_top_secret.docx...",
    "Downloading database... 34% complete",
    "Bypassing CIA proxy server in Grodno..."
];

function startHackerAttack() {
    const overlay = document.createElement('div');
    overlay.className = 'hacker-overlay';
    overlay.innerHTML = `
        <div class="hacker-scroller"></div>
        <div class="hacker-window">
            <div class="hw-header">
                <span class="hw-dot red"></span>
                <span class="hw-dot yellow"></span>
                <span class="hw-dot green"></span>
                <span class="hw-title">TERMINAL_PENTAGON_INTRUDER</span>
            </div>
            <div class="hw-body">
                <div class="hw-target">TARGET: PENTAGON_SECURE_MAINFRAME_v4.2</div>
                <div class="hw-progress-bar-wrapper">
                    <div class="hw-progress-bar"></div>
                </div>
                <div class="hw-percentage">PROGRESS: 0%</div>
                <div class="hw-status">Status: Initializing brute force...</div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const scroller = overlay.querySelector('.hacker-scroller');
    const progressBar = overlay.querySelector('.hw-progress-bar');
    const percentageEl = overlay.querySelector('.hw-percentage');
    const statusEl = overlay.querySelector('.hw-status');
    const windowEl = overlay.querySelector('.hacker-window');
    const bodyEl = overlay.querySelector('.hw-body');

    // 1. Скроллер логов на фоне
    const logInterval = setInterval(() => {
        const line = document.createElement('div');
        const randomIp = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        const randomLog = HACKER_LOGS[Math.floor(Math.random() * HACKER_LOGS.length)];
        line.textContent = `[${new Date().toLocaleTimeString()}] IP: ${randomIp} >> ${randomLog}`;
        scroller.appendChild(line);
        if (scroller.children.length > 40) {
            scroller.removeChild(scroller.firstChild);
        }
        scroller.scrollTop = scroller.scrollHeight;
    }, 100);

    // 2. Прогресс бар
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.floor(Math.random() * 4) + 1;
        if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);
            clearInterval(logInterval);
            triggerSuccess();
        }

        progressBar.style.width = `${progress}%`;
        percentageEl.textContent = `PROGRESS: ${progress}%`;

        // Статусы
        if (progress < 20) {
            statusEl.textContent = "Status: Establishing VPN tunnels through Belarus proxy...";
        } else if (progress < 40) {
            statusEl.textContent = "Status: Bypassing Pentagon security gateway (CVE-2026-9999)...";
        } else if (progress < 60) {
            statusEl.textContent = "Status: Brute forcing admin credentials (sha256 decryption)...";
        } else if (progress < 80) {
            statusEl.textContent = "Status: Accessing secret database tables and downloading files...";
        } else if (progress < 95) {
            statusEl.textContent = "Status: Stealing Daymon's secret config files...";
        } else {
            statusEl.textContent = "Status: Erasure of logs and cleanup of intrusion signs...";
        }
    }, 150);

    function triggerSuccess() {
        unlockDirectAchievement('secret-hack');
        windowEl.classList.add('success');
        
        // Звук успеха
        const sound = new Audio('assets/Burp1.mp3');
        sound.volume = 0.4;
        sound.play().catch(()=>{});

        bodyEl.innerHTML = `
            <div class="hw-target" style="color: #ffd700; text-align: center; font-size: 1.1rem; text-shadow: 0 0 10px #ffd700;">[ HACK SUCCESSFUL! ]</div>
            <div style="font-size: 0.75rem; color: #fff; line-height: 1.4; display: flex; flex-direction: column; gap: 8px; margin: 10px 0;">
                <p>> All launch codes acquired successfully.</p>
                <p>> Secret files downloaded:</p>
                <p style="color: #ffd700; padding-left: 10px;">- "daymon_nude_config.cfg" (4.2 GB)</p>
                <p style="color: #ffd700; padding-left: 10px;">- "fbi_most_wanted_streamers.pdf" (1.4 MB)</p>
                <p style="color: #ef4444; font-weight: bold;">> Warning: FBI is on their way. Have a nice day!</p>
            </div>
            <button class="hw-btn">CLOSE CONSOLE</button>
        `;

        const closeBtn = bodyEl.querySelector('.hw-btn');
        closeBtn.onclick = () => {
            overlay.style.transition = 'opacity 0.3s';
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        };
    }
}