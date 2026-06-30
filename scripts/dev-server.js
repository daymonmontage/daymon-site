const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const PORT = 8000;
const handler = require(path.join(__dirname, '..', '..', 'daymon-api', 'api', 'download.js'));

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Маршрут для Serverless API
    if (pathname === '/api/download') {
        req.query = parsedUrl.query;
        
        // Express-like полифилы для эмуляции среды Vercel
        res.status = (statusCode) => {
            res.statusCode = statusCode;
            return res;
        };
        res.json = (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
        };
        
        try {
            await handler(req, res);
        } catch (err) {
            console.error("API error:", err);
            res.status(500).json({ error: "Internal server error", message: err.message });
        }
        return;
    }

    // Раздача статических файлов сайта
    let filePath = path.join(__dirname, '..', pathname === '/' ? 'index.html' : pathname);
    
    // Защита от выхода за пределы папки проекта (path traversal)
    const rootPath = path.resolve(__dirname, '..');
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(rootPath)) {
        res.statusCode = 403;
        res.end("403 Forbidden");
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.statusCode = 404;
            res.end("404 Not Found");
            return;
        }

        const mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.ico': 'image/x-icon',
            '.mp3': 'audio/mpeg',
            '.webp': 'image/webp'
        };

        const ext = path.extname(filePath).toLowerCase();
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`Локальный сервер разработки запущен по адресу http://localhost:${PORT}/`);
});
