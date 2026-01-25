import { CONFIG } from './config.js';
import { setGlobalClickCount } from './ui.js'; // <--- ИМПОРТ ФУНКЦИИ ОБНОВЛЕНИЯ UI

let supabase = null;
let currentUser = null;
export let isUserLoggedIn = false;

const TARGET_GUILD_ID = '447505276594159620'; 

export async function initAuth() {
    if (!window.supabase) {
        console.error("Supabase library not loaded!");
        return;
    }

    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');

    // Логика входа
    if (loginBtn) {
        loginBtn.onclick = async () => {
            const cleanUrl = window.location.origin + window.location.pathname;
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    redirectTo: cleanUrl,
                    scopes: 'guilds'
                }
            });
            if (error) console.error("Login error:", error);
        };
    }

    // Логика выхода
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await supabase.auth.signOut();
            
            // === ОЧИСТКА ДАННЫХ ПРИ ВЫХОДЕ ===
            localStorage.removeItem('discord_guild_check');
            localStorage.removeItem('avatar_clicks'); // Удаляем клики
            localStorage.removeItem('unlocked_achievements'); // Удаляем ачивки (опционально)
            // =================================
            
            window.location.reload();
        };
    }

    // Проверка сессии
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        currentUser = session.user;
        isUserLoggedIn = true;
        
        // UI: Авторизован
        if (loginBtn) {
            loginBtn.style.display = 'none';
            loginBtn.classList.remove('not-logged-in');
        }
        
        if (userProfile) {
            userProfile.style.display = 'flex';
            userName.textContent = currentUser.user_metadata.full_name || currentUser.email;
            userAvatar.src = currentUser.user_metadata.avatar_url || 'assets/avatar.png';
        }

        // Запуск проверок и синхронизации
        await syncAchievements();
        await syncClicks(); // <--- СИНХРОНИЗАЦИЯ КЛИКОВ
        checkDiscordMembership(session.provider_token);
    } else {
        // UI: Не авторизован
        isUserLoggedIn = false;
        if (loginBtn) {
            loginBtn.style.display = 'flex';
            loginBtn.classList.add('not-logged-in');
        }
        if (userProfile) userProfile.style.display = 'none';
    }
}

// === СИНХРОНИЗАЦИЯ КЛИКОВ ===
async function syncClicks() {
    if (!currentUser || !supabase) return;

    // 1. Получаем клики из базы
    const { data, error } = await supabase
        .from('profiles')
        .select('avatar_clicks')
        .eq('id', currentUser.id)
        .single();

    if (data) {
        const dbClicks = data.avatar_clicks || 0;
        // Обновляем локальное хранилище и UI
        setGlobalClickCount(dbClicks);
        console.log(`[Auth] Clicks synced: ${dbClicks}`);
    }
}

// === СОХРАНЕНИЕ КЛИКОВ (Вызывается из UI) ===
export async function saveClicksToCloud(count) {
    if (!currentUser || !supabase) return;

    const { error } = await supabase
        .from('profiles')
        .upsert({ 
            id: currentUser.id, 
            avatar_clicks: count 
        });

    if (error) console.error("Error saving clicks:", error);
}

// === ПРОВЕРКА ПОДПИСКИ НА ДИСКОРД ===
async function checkDiscordMembership(providerToken) {
    const alertBox = document.getElementById('discord-join-alert');
    if (!alertBox) return;

    if (!providerToken) {
        const cachedStatus = localStorage.getItem('discord_guild_check');
        if (cachedStatus === 'false') alertBox.style.display = 'flex';
        return;
    }

    try {
        const res = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${providerToken}`
            }
        });

        if (res.ok) {
            const guilds = await res.json();
            const isMember = guilds.some(g => g.id === TARGET_GUILD_ID);

            if (!isMember) {
                alertBox.style.display = 'flex';
                localStorage.setItem('discord_guild_check', 'false');
            } else {
                alertBox.style.display = 'none';
                localStorage.setItem('discord_guild_check', 'true');
            }
        }
    } catch (e) {
        console.warn("Discord API check failed", e);
    }
}

export async function syncAchievements() {
    if (!currentUser || !supabase) return;

    const localData = JSON.parse(localStorage.getItem('unlocked_achievements')) || [];
    
    const { data: dbRow, error } = await supabase
        .from('profiles')
        .select('achievements')
        .eq('id', currentUser.id)
        .single();

    let dbData = [];
    if (dbRow) dbData = dbRow.achievements || [];

    const merged = [...new Set([...localData, ...dbData])];

    if (merged.length > localData.length || merged.length > dbData.length) {
        localStorage.setItem('unlocked_achievements', JSON.stringify(merged));
        
        await supabase
            .from('profiles')
            .upsert({ id: currentUser.id, achievements: merged });
            
        window.dispatchEvent(new Event('achievements_updated'));
    }
}

export async function saveToCloud(newKey) {
    if (!currentUser || !supabase) return;
    
    const { data: dbRow } = await supabase
        .from('profiles')
        .select('achievements')
        .eq('id', currentUser.id)
        .single();
        
    let currentList = dbRow ? (dbRow.achievements || []) : [];
    
    if (!currentList.includes(newKey)) {
        currentList.push(newKey);
        await supabase
            .from('profiles')
            .upsert({ id: currentUser.id, achievements: currentList });
    }
}