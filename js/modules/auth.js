import { CONFIG } from './config.js';
import { setGlobalClickCount } from './ui.js';

let supabase = null;
let currentUser = null;
export let isUserLoggedIn = false;

const TARGET_GUILD_ID = '447505276594159620'; 

export async function initAuth() {
    if (!window.supabase) return;

    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');

    if (loginBtn) {
        loginBtn.onclick = async () => {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    redirectTo: window.location.origin + window.location.pathname,
                    scopes: 'guilds'
                }
            });
        };
    }

    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await supabase.auth.signOut();
            localStorage.clear();
            window.location.reload();
        };
    }

    // Слушатель изменения состояния (важно для синхронизации вкладок)
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            handleUserIn(session.user, session.provider_token);
        } else if (event === 'SIGNED_OUT') {
            handleUserOut();
        }
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        handleUserIn(session.user, session.provider_token);
    }
}

async function handleUserIn(user, token) {
    currentUser = user;
    isUserLoggedIn = true;

    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');

    if (loginBtn) loginBtn.style.display = 'none';
    if (userProfile) {
        userProfile.style.display = 'flex';
        userName.textContent = user.user_metadata.full_name || user.email;
        userAvatar.src = user.user_metadata.avatar_url || 'assets/avatar.png';
    }

    await syncAchievements();
    await syncClicks();
    if (token) checkDiscordMembership(token);
}

function handleUserOut() {
    isUserLoggedIn = false;
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    if (loginBtn) loginBtn.style.display = 'flex';
    if (userProfile) userProfile.style.display = 'none';
}

async function syncClicks() {
    if (!currentUser) return;
    const { data } = await supabase.from('profiles').select('avatar_clicks').eq('id', currentUser.id).single();
    if (data) setGlobalClickCount(data.avatar_clicks || 0);
}

export async function saveClicksToCloud(count) {
    if (!currentUser) return;
    await supabase.from('profiles').upsert({ id: currentUser.id, avatar_clicks: count });
}

async function checkDiscordMembership(providerToken) {
    const alertBox = document.getElementById('discord-join-alert');
    if (!alertBox) return;

    try {
        const res = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${providerToken}` }
        });
        if (res.ok) {
            const guilds = await res.json();
            const isMember = guilds.some(g => g.id === TARGET_GUILD_ID);
            alertBox.style.display = isMember ? 'none' : 'flex';
        }
    } catch (e) {}
}

export async function syncAchievements() {
    if (!currentUser) return;
    const localData = JSON.parse(localStorage.getItem('unlocked_achievements')) || [];
    const { data: dbRow } = await supabase.from('profiles').select('achievements').eq('id', currentUser.id).single();
    let dbData = dbRow ? (dbRow.achievements || []) : [];
    const merged = [...new Set([...localData, ...dbData])];
    if (merged.length > localData.length || merged.length > dbData.length) {
        localStorage.setItem('unlocked_achievements', JSON.stringify(merged));
        await supabase.from('profiles').upsert({ id: currentUser.id, achievements: merged });
        window.dispatchEvent(new Event('achievements_updated'));
    }
}

export async function saveToCloud(newKey) {
    if (!currentUser) return;
    const { data: dbRow } = await supabase.from('profiles').select('achievements').eq('id', currentUser.id).single();
    let currentList = dbRow ? (dbRow.achievements || []) : [];
    if (!currentList.includes(newKey)) {
        currentList.push(newKey);
        await supabase.from('profiles').upsert({ id: currentUser.id, achievements: currentList });
    }
}