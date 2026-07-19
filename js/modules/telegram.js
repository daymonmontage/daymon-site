import { CONFIG } from './config.js';

export function initTelegramFeed() {
    const feedContainer = document.getElementById('telegram-feed');
    if (!feedContainer) return;

    fetchTelegramPosts(feedContainer);
}

async function fetchTelegramPosts(container) {
    const apiUrl = CONFIG.DOWNLOAD_API_URL.replace('/api/download', '/api/telegram');

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Failed to load Telegram feed");

        const data = await response.json();
        if (!data || !data.posts || data.posts.length === 0) {
            renderError(container, "Нет доступных новостей.");
            return;
        }

        renderPosts(container, data.posts);
    } catch (error) {
        console.error("Telegram feed error:", error);
        renderError(container, "Не удалось загрузить ленту новостей.");
    }
}

function renderPosts(container, posts) {
    container.innerHTML = ''; // clear loader

    posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'tg-post-card';

        // Format Date
        const dateObj = new Date(post.date);
        const formattedDate = dateObj.toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Parse links in text
        const parsedText = parseLinks(post.text);

        let imageHtml = '';
        if (post.image) {
            imageHtml = `
                <div class="tg-post-image-container">
                    <img src="${post.image}" class="tg-post-image" alt="Telegram Media">
                </div>
            `;
        }

        card.innerHTML = `
            <div class="tg-post-header">
                <span class="tg-post-author">
                    <i class="fab fa-telegram"></i> Daymon | Анонсы
                </span>
                <span class="tg-post-date">${formattedDate}</span>
            </div>
            <div class="tg-post-body">
                <div class="tg-post-text">${parsedText}</div>
                ${imageHtml}
            </div>
            <div class="tg-post-footer">
                <a href="${post.link}" target="_blank" class="tg-post-link-btn">
                    Читать в TG <i class="fas fa-external-link-alt"></i>
                </a>
            </div>
        `;

        container.appendChild(card);
    });
}

function renderError(container, message) {
    container.innerHTML = `
        <div style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 20px 0;">
            <i class="fas fa-exclamation-circle" style="color: #ef4444; margin-right: 8px;"></i> ${message}
        </div>
    `;
}

function parseLinks(text) {
    if (!text) return '';
    // Escape standard HTML tags to prevent XSS
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // Regex to match URLs and replace them with anchor links
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return escaped.replace(urlPattern, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
}
