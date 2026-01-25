import { CONFIG } from './config.js';
import { unlockDirectAchievement } from './achievements.js';
import { saveClicksToCloud } from './auth.js'; 

let donorDataList = [];
let isDonorsLoaded = false;

// Переменные для кликера
let currentClicks = 0;
let updateClickUI = null; 

export function setFloatingDonors(list) {
    donorDataList = list;
    isDonorsLoaded = true;
}

// === ВОТ ЭТА ФУНКЦИЯ, КОТОРУЮ НЕ МОЖЕТ НАЙТИ БРАУЗЕР ===
export function setGlobalClickCount(count) {
    currentClicks = count;
    localStorage.setItem('avatar_clicks', count);
    if (updateClickUI) updateClickUI();
}
// =======================================================

export function setupUI() {
    setupTiltEffect();
    renderSpaceBackground();
    setupEasterEgg(); 
    setupStartupSound(); 
    
    const removeLoader = () => {
        const loader = document.getElementById('preloader');
        if (loader && !loader.classList.contains('finished')) {
            loader.classList.add('finished');
        }
    };

    window.addEventListener('load', () => {
        setTimeout(removeLoader, 600);
    });

    // Страховка, если load не сработает
    setTimeout(removeLoader, 3000);
}

function setupStartupSound() {
    const audio = new Audio('assets/startup.mp3');
    audio.volume = 0.1; 

    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise.catch(() => {
            const playOnInteraction = () => {
                const loader = document.getElementById('preloader');
                if (loader && loader.classList.contains('finished')) {
                    removeListeners();
                    return;
                }
                audio.play();
                removeListeners();
            };
            const removeListeners = () => {
                document.removeEventListener('click', playOnInteraction);
                document.removeEventListener('keydown', playOnInteraction);
            };
            document.addEventListener('click', playOnInteraction);
            document.addEventListener('keydown', playOnInteraction);
        });
    }
}

function setupTiltEffect() {
    const cards = document.querySelectorAll('.tilt-effect');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const rx = ((y - cy) / cy) * -CONFIG.TILT_FORCE; 
            const ry = ((x - cx) / cx) * CONFIG.TILT_FORCE;
            card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.01)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });
}

function renderSpaceBackground() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-2;pointer-events:none;';
    document.body.appendChild(canvas);

    let width, height;
    let stars = [];
    let floatingTexts = [];

    const resize = () => { 
        width = canvas.width = window.innerWidth; 
        height = canvas.height = window.innerHeight; 
    };
    
    const initStars = () => {
        stars = [];
        for (let i = 0; i < 60; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.3 + 0.05,
                alpha: Math.random() * 0.5 + 0.3
            });
        }
    };

    const createFloatingText = (yStart) => {
        if (!isDonorsLoaded || donorDataList.length === 0) return null;

        const donor = donorDataList[Math.floor(Math.random() * donorDataList.length)];
        
        let color = 'rgba(180, 180, 190, 0.15)'; 
        let glowColor = 'rgba(255, 255, 255, 0.2)';
        let fontSize = 10;
        let speed = 0.15;
        let blurAmount = 5;
        let zIndex = 0;
        let oscAmp = 20; 
        let oscSpeed = 0.002;

        if (donor.value >= 1000) {
            color = 'rgba(255, 215, 0, 0.4)'; 
            glowColor = 'rgba(255, 215, 0, 0.6)';
            fontSize = 14 + Math.random() * 4;
            speed = 0.3 + Math.random() * 0.2;
            blurAmount = 15;
            zIndex = 2;
            oscAmp = 40;
        } else if (donor.value >= 500) {
            color = 'rgba(249, 115, 22, 0.3)'; 
            glowColor = 'rgba(249, 115, 22, 0.5)';
            fontSize = 12 + Math.random() * 2;
            speed = 0.2 + Math.random() * 0.15;
            blurAmount = 10;
            zIndex = 1;
            oscAmp = 30;
        } else {
            fontSize = 9 + Math.random() * 2;
            speed = 0.1 + Math.random() * 0.1;
        }

        return {
            text: donor.name,
            xBase: Math.random() * (width - 100) + 50,
            y: yStart,
            size: fontSize,
            color: color,
            glowColor: glowColor,
            blur: blurAmount,
            speed: speed,
            zIndex: zIndex,
            oscOffset: Math.random() * 1000,
            oscAmp: oscAmp,
            oscSpeed: oscSpeed
        };
    };

    const initFloatingTexts = () => {
        floatingTexts = [];
        for (let i = 0; i < 12; i++) {
            const txt = createFloatingText(Math.random() * height);
            if (txt) floatingTexts.push(txt);
        }
    };

    let checkInterval = setInterval(() => {
        if (isDonorsLoaded) {
            initFloatingTexts();
            clearInterval(checkInterval);
        }
    }, 1000);

    const animate = () => {
        ctx.clearRect(0, 0, width, height);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        stars.forEach(s => {
            s.y -= s.speed;
            if (s.y < 0) { s.y = height; s.x = Math.random() * width; }
            ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
        });

        if (floatingTexts.length > 0) {
            floatingTexts.sort((a, b) => a.zIndex - b.zIndex);
            const now = Date.now();

            floatingTexts.forEach((t, index) => {
                t.y -= t.speed;
                
                const currentX = t.xBase + Math.sin(now * t.oscSpeed + t.oscOffset) * t.oscAmp;

                if (t.y < -50) {
                    const newT = createFloatingText(height + Math.random() * 100);
                    if (newT) floatingTexts[index] = newT;
                    else t.y = height;
                }

                ctx.font = `bold ${t.size}px 'Montserrat', sans-serif`;
                ctx.fillStyle = t.color;
                ctx.textAlign = 'center';
                
                ctx.shadowColor = t.glowColor;
                ctx.shadowBlur = t.blur;
                
                ctx.fillText(t.text, currentX, t.y);
                
                ctx.shadowBlur = 0; 
            });
        }

        requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize(); 
    initStars(); 
    animate();
}

function setupEasterEgg() {
    const container = document.querySelector('.avatar-container');
    const avatar = container.querySelector('img');
    const counterUI = document.getElementById('click-counter-wrapper');
    const countVal = document.getElementById('click-val');
    const resetBtn = document.getElementById('reset-clicks');
    
    if (!avatar || !container) return;

    // Инициализация кликов
    currentClicks = parseInt(localStorage.getItem('avatar_clicks')) || 0;
    
    let activeSpecialSound = null;
    let saveTimeout = null; 

    const soundTikae = new Audio('assets/tikae.mp3'); 
    soundTikae.volume = 0.4;

    const burpSounds = [
        new Audio('assets/Burp1.mp3'),
        new Audio('assets/Burp2.mp3'),
        new Audio('assets/Burp3.mp3'),
        new Audio('assets/Burp4.mp3'),
        new Audio('assets/Burp5.mp3')
    ];
    burpSounds.forEach(s => s.volume = 0.1);

    const soundGarfield = new Audio('assets/ahh.mp3');
    soundGarfield.volume = 0.6;

    const soundSkelet = new Audio('assets/bad-to-the-bone-meme.mp3');
    soundSkelet.volume = 0.2;

    updateClickUI = () => {
        countVal.textContent = currentClicks;
        if (currentClicks > 10) {
            container.classList.add('lifted');
            counterUI.classList.add('visible');
        } else {
            container.classList.remove('lifted');
            counterUI.classList.remove('visible');
        }
    };

    updateClickUI();

    avatar.addEventListener('click', () => {
        if (document.querySelector('.screamer-overlay')) return;

        if (activeSpecialSound) {
            activeSpecialSound.pause();
            activeSpecialSound.currentTime = 0;
            activeSpecialSound = null;
        }
        avatar.src = 'assets/avatar.png'; 

        currentClicks++;
        updateClickUI();
        localStorage.setItem('avatar_clicks', currentClicks);
        
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveClicksToCloud(currentClicks);
        }, 2000);

        // Ачивки
        if (currentClicks === 67) unlockDirectAchievement('click-67');
        if (currentClicks === 100) unlockDirectAchievement('click-100');
        if (currentClicks === 228) unlockDirectAchievement('click-228');
        if (currentClicks === 666) unlockDirectAchievement('click-666');
        if (currentClicks === 777) unlockDirectAchievement('click-777');
        if (currentClicks === 1000) unlockDirectAchievement('click-1000');
        if (currentClicks === 1337) unlockDirectAchievement('click-1337');
        if (currentClicks === 1488) unlockDirectAchievement('click-1488');

        const rng = Math.random();
        const isMuted = localStorage.getItem('sfx_muted') === 'true';

        if (rng < 0.02 && !isMuted) {
            avatar.src = 'assets/avatar2.png';
            activeSpecialSound = soundGarfield.cloneNode();
            activeSpecialSound.volume = 0.6;
            activeSpecialSound.play().catch(()=>{});
            activeSpecialSound.addEventListener('ended', () => {
                avatar.src = 'assets/avatar.png';
                activeSpecialSound = null;
            });
            avatar.style.transition = '0.1s';
            avatar.style.transform = 'scale(1.2) rotate(5deg)';
            setTimeout(() => { avatar.style.transform = 'scale(1.2) rotate(-5deg)'; }, 100);
        }
        else if (rng < 0.06 && !isMuted) {
            avatar.src = 'assets/avatar-skelet.png';
            activeSpecialSound = soundSkelet.cloneNode();
            activeSpecialSound.volume = 0.2;
            activeSpecialSound.play().catch(()=>{});
            activeSpecialSound.addEventListener('ended', () => {
                avatar.src = 'assets/avatar.png';
                activeSpecialSound = null;
            });
            avatar.style.transition = '0.05s';
            avatar.style.transform = 'scale(1.15)';
            setTimeout(() => { avatar.style.transform = 'scale(1.15) translateX(2px)'; }, 50);
            setTimeout(() => { avatar.style.transform = 'scale(1.15) translateX(-2px)'; }, 100);
            setTimeout(() => { avatar.style.transform = 'scale(1.15) translateX(2px)'; }, 150);
        }
        else if (rng < 0.21 && !isMuted) {
            avatar.src = 'assets/avatar-2.png';
            const soundClone = soundTikae.cloneNode();
            soundClone.volume = 0.4; 
            soundClone.play().catch(()=>{});
            soundClone.addEventListener('ended', () => {
                if (avatar.src.includes('avatar-2.png')) avatar.src = 'assets/avatar.png';
            });
            avatar.style.transition = '0.1s';
            avatar.style.transform = 'scale(1.1) rotate(15deg)';
            setTimeout(() => { avatar.style.transform = 'scale(1.1) rotate(-15deg)'; }, 100);
            setTimeout(() => { 
                avatar.style.transition = '0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                avatar.style.transform = 'scale(1) rotate(0deg)'; 
            }, 300);
        }
        else {
            avatar.src = 'assets/avatar-2.png';
            avatar.style.transition = '0.1s';
            avatar.style.transform = 'scale(1.05) translateY(5px)'; 
            
            if (!isMuted) {
                const randomIndex = Math.floor(Math.random() * burpSounds.length);
                const burpClone = burpSounds[randomIndex].cloneNode();
                burpClone.volume = 0.1; 
                burpClone.play().catch(()=>{});
                burpClone.addEventListener('ended', () => {
                    if (avatar.src.includes('avatar-2.png')) avatar.src = 'assets/avatar.png';
                });
            } else {
                setTimeout(() => {
                    if (avatar.src.includes('avatar-2.png')) avatar.src = 'assets/avatar.png';
                }, 200);
            }
            setTimeout(() => { avatar.style.transform = 'scale(1.05) translateY(-2px)'; }, 100);
            setTimeout(() => { 
                avatar.style.transition = '0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                avatar.style.transform = 'scale(1) rotate(0deg)'; 
            }, 300);
        }
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentClicks = 0;
            localStorage.setItem('avatar_clicks', 0);
            saveClicksToCloud(0); 
            updateClickUI();
        });
    }
}