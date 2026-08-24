import { CONFIG } from './config.js';

export function initTelegramFeed() {
    const feedContainer = document.getElementById('telegram-feed');
    if (!feedContainer) return;

    fetchTelegramPosts(feedContainer);
}

async function fetchTelegramPosts(container) {
    const apiUrl = CONFIG.DOWNLOAD_API_URL.replace('/api/download', '/api/telegram');

    try {
        let posts = [];
        try {
            const response = await fetch(apiUrl);
            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data.posts) && data.posts.length > 0) {
                    posts = data.posts;
                }
            }
        } catch {
            // ignore
        }

        if (posts.length === 0) {
            const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://t.me/s/daymonstream');
            const res = await fetch(proxyUrl);
            if (res.ok) {
                const data = await res.json();
                if (data && data.contents) {
                    posts = parseTelegramHtmlClient(data.contents);
                }
            }
        }

        if (posts.length === 0) {
            renderError(container, "Нет доступных новостей.");
            return;
        }

        renderPosts(container, posts);
    } catch (error) {
        console.error("Telegram feed error:", error);
        renderError(container, "Не удалось загрузить ленту новостей.");
    }
}

function decodeHtmlEntities(str) {
    if (!str) return '';
    return str
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

function parseTelegramHtmlClient(html, channelName = 'daymonstream') {
    const messageBlocks = html.split('class="tgme_widget_message_wrap');
    const posts = [];

    for (let i = 1; i < messageBlocks.length; i++) {
        const block = messageBlocks[i];
        const postMatch = block.match(/data-post="[^"]+\/(\d+)"/);
        if (!postMatch) continue;
        const postId = postMatch[1];
        const link = `https://t.me/${channelName}/${postId}`;

        const dateMatch = block.match(/class="tgme_widget_message_date"[^>]*href="[^"]+"[^>]*><time\s+datetime="([^"]+)"/);
        const date = dateMatch ? dateMatch[1] : new Date().toISOString();

        const viewsMatch = block.match(/<span class="tgme_widget_message_views">([^<]+)<\/span>/);
        const views = viewsMatch ? viewsMatch[1].trim() : null;

        const fwdMatch = block.match(/class="tgme_widget_message_forwarded_from_name"[^>]*><span[^>]*>([^<]+)<\/span>/);
        const forwardedFrom = fwdMatch ? decodeHtmlEntities(fwdMatch[1].trim()) : null;

        let text = "";
        const textStart = block.indexOf('class="tgme_widget_message_text');
        if (textStart !== -1) {
            const contentStart = block.indexOf('>', textStart) + 1;
            let divCount = 1;
            let textEnd = contentStart;
            while (divCount > 0 && textEnd < block.length) {
                const nextOpen = block.indexOf('<div', textEnd);
                const nextClose = block.indexOf('</div>', textEnd);
                if (nextClose === -1) break;
                if (nextOpen !== -1 && nextOpen < nextClose) {
                    divCount++;
                    textEnd = nextOpen + 4;
                } else {
                    divCount--;
                    textEnd = nextClose + 6;
                }
            }
            const rawTextHtml = block.substring(contentStart, textEnd - 6);
            const formatted = rawTextHtml
                .replace(/<i class="emoji"[^>]*><b>([^<]+)<\/b><\/i>/gi, '$1')
                .replace(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, anchorText) => {
                    const cleanText = anchorText.replace(/<\/?[^>]+(>|$)/g, '').trim();
                    if (!cleanText || cleanText === href) return href;
                    if (!cleanText.includes('http') && href.startsWith('http')) {
                        return `${cleanText}: ${href}`;
                    }
                    return cleanText;
                })
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>\s*<p>/gi, '\n\n')
                .replace(/<\/?[^>]+(>|$)/g, "");

            text = decodeHtmlEntities(formatted).trim();
        }

        const photos = [];
        const photoRegex = /background-image:\s*url\(['"]?([^'"]+)['"]?\)/g;
        let match;
        while ((match = photoRegex.exec(block)) !== null) {
            const imgUrl = match[1];
            if (
                !imgUrl.includes('/emoji/') &&
                !imgUrl.includes('user_photo') &&
                !imgUrl.includes('/avatars/') &&
                (imgUrl.includes('telesco.pe') ||
                    imgUrl.includes('telegram.org') ||
                    imgUrl.includes('telegram-cdn.org') ||
                    imgUrl.includes('cdn') ||
                    imgUrl.startsWith('http'))
            ) {
                if (!photos.includes(imgUrl)) {
                    photos.push(imgUrl);
                }
            }
        }

        let videoUrl = null;
        const videoMatch = block.match(/<video[^>]*src="([^"]+)"/);
        if (videoMatch) {
            videoUrl = videoMatch[1];
        }

        const isRoundVideo = block.includes('roundvideo') || block.includes('tgme_widget_message_roundvideo');

        const reactions = [];
        const reactionMatches = block.matchAll(/<span class="tgme_reaction[^"]*">[\s\S]*?<b>([^<]+)<\/b><\/i>\s*(\d*)/g);
        for (const r of reactionMatches) {
            reactions.push({
                emoji: r[1],
                count: r[2] ? parseInt(r[2], 10) : 1
            });
        }

        const isStreamAlert = text.includes('СТРИМ ОНЛАЙН') || text.includes('Стрим онлайн');
        const isCategoryChange = text.includes('СМЕНА КАТЕГОРИИ') || text.includes('Смена категории') || text.includes('СМЕНА ИГРЫ');
        const isStreamEnd = text.includes('СТРИМ ОКОНЧЕН') || text.includes('Стрим окончен');

        if (!text && photos.length === 0 && !videoUrl) {
            continue;
        }

        posts.push({
            id: postId,
            link,
            date,
            views,
            forwardedFrom,
            text,
            image: photos.length > 0 ? photos[0] : null,
            images: photos,
            video: videoUrl,
            isRoundVideo,
            reactions,
            isStreamAlert,
            isCategoryChange,
            isStreamEnd
        });
    }

    return posts.reverse();
}

function renderPosts(container, posts) {
    container.innerHTML = '';

    posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'tg-post-card';

        const dateObj = new Date(post.date);
        const formattedDate = dateObj.toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const parsedText = parseLinks(post.text);

        let mediaHtml = '';
        if (post.images && post.images.length > 1) {
            mediaHtml = `
                <div class="tg-post-album-grid">
                    ${post.images.map(img => `
                        <div class="tg-post-album-item">
                            <img src="${img}" alt="Media" referrerPolicy="no-referrer" loading="lazy">
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (post.image) {
            mediaHtml = `
                <div class="tg-post-image-container">
                    <img src="${post.image}" class="tg-post-image" alt="Telegram Media" referrerPolicy="no-referrer" loading="lazy">
                </div>
            `;
        }

        let videoHtml = '';
        if (post.video) {
            videoHtml = `
                <div class="tg-post-video-container">
                    <video src="${post.video}" class="tg-post-video" controls playsInline preload="metadata" referrerPolicy="no-referrer"></video>
                </div>
            `;
        }

        let reactionsHtml = '';
        if (post.reactions && post.reactions.length > 0) {
            reactionsHtml = `
                <div class="tg-post-reactions">
                    ${post.reactions.map(r => `
                        <span class="tg-post-reaction-pill">
                            <span>${r.emoji}</span>
                            <span style="font-weight: 600; font-size: 0.75rem;">${r.count}</span>
                        </span>
                    `).join('')}
                </div>
            `;
        }

        let badgesHtml = '';
        if (post.forwardedFrom) {
            badgesHtml += `<span class="tg-post-forwarded"><i class="fas fa-share" style="font-size: 0.7rem;"></i> ${post.forwardedFrom}</span>`;
        }
        if (post.isStreamAlert) {
            badgesHtml += `<span class="tg-badge tg-badge-stream">🔴 Стрим онлайн</span>`;
        }

        let viewsHtml = post.views ? `<span><i class="fas fa-eye" style="margin-right: 4px;"></i>${post.views}</span>` : '';

        let labelHtml = '';
        if (!post.text) {
            if (post.video) {
                labelHtml = `<div style="display:inline-flex;align-items:center;gap:6px;font-size:0.82rem;color:#38bdf8;background:rgba(56,189,248,0.1);padding:4px 10px;border-radius:6px;width:fit-content"><i class="fas fa-video"></i> Видеосообщение (кружочек)</div>`;
            } else if (post.image) {
                labelHtml = `<div style="display:inline-flex;align-items:center;gap:6px;font-size:0.82rem;color:#94a3b8;background:rgba(255,255,255,0.05);padding:4px 10px;border-radius:6px;width:fit-content"><i class="fas fa-image"></i> Фотография</div>`;
            }
        }

        card.innerHTML = `
            <div class="tg-post-header">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span class="tg-post-author">
                        <i class="fab fa-telegram"></i> Daymon | Анонсы
                    </span>
                    ${badgesHtml}
                </div>
                <div class="tg-post-meta">
                    ${viewsHtml}
                    <span class="tg-post-date">${formattedDate}</span>
                </div>
            </div>
            <div class="tg-post-body" style="display:flex;flex-direction:column;gap:12px;margin-top:10px;">
                ${parsedText ? `<div class="tg-post-text" style="font-size:0.94rem;line-height:1.6;color:#f8fafc;white-space:pre-wrap;word-break:break-word;">${parsedText}</div>` : labelHtml}
                ${mediaHtml}
                ${videoHtml}
                ${reactionsHtml}
            </div>
            <div class="tg-post-footer" style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06);margin-top:8px;gap:8px;flex-wrap:wrap;">
                <a href="${post.link || 'https://t.me/daymonstream'}" target="_blank" rel="noopener noreferrer" class="tg-post-link-btn">
                    Читать в TG <i class="fas fa-external-link-alt" style="font-size: 0.7rem;"></i>
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
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return escaped.replace(urlPattern, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
}
