const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// --- BACKEND API ENDPOINTS ---

app.get('/api/info', (req, res) => {
    const { url } = req.query;
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
        return res.status(400).json({ error: 'Please provide a valid YouTube link.' });
    }

    exec(`python -m yt_dlp -J "${url}"`, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to fetch video info.' });
        }

        try {
            const info = JSON.parse(stdout);

            if (info.duration < 10 || info.duration > 7200) {
                return res.status(400).json({ error: 'Video duration must be between 10 seconds and 2 hours.' });
            }

            let format18 = info.formats.find(f => f.format_id === '18');
            let format140 = info.formats.find(f => f.format_id === '140');

            const options = [];

            if (format18) {
                options.push({
                    type: 'video', label: 'Video + Audio (360p)',
                    formatId: '18', sizeBytes: format18.filesize || format18.filesize_approx || null, ext: format18.ext || 'mp4'
                });
            } else {
                const maybe360 = info.formats.find(f => f.height === 360 && f.acodec !== 'none' && f.vcodec !== 'none');
                if (maybe360) options.push({ type: 'video', label: 'Video + Audio (360p)', formatId: maybe360.format_id, sizeBytes: maybe360.filesize || maybe360.filesize_approx || null, ext: maybe360.ext || 'mp4' });
            }

            if (format140) {
                options.push({
                    type: 'audio', label: 'Audio Only',
                    formatId: '140', sizeBytes: format140.filesize || format140.filesize_approx || null, ext: format140.ext || 'm4a'
                });
            } else {
                const bestAudio = info.formats.filter(f => f.vcodec === 'none' && f.acodec !== 'none').pop();
                if (bestAudio) options.push({ type: 'audio', label: 'Audio Only', formatId: bestAudio.format_id, sizeBytes: bestAudio.filesize || bestAudio.filesize_approx || null, ext: bestAudio.ext || 'm4a' });
            }

            res.json({ title: info.title, thumbnail: info.thumbnail, duration: info.duration, options: options });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error parsing video info.' });
        }
    });
});

app.get('/api/download', (req, res) => {
    const { url, formatId, ext, title, size } = req.query;
    if (!url || !formatId) return res.status(400).send('Missing url or formatId');

    const safeTitle = (title || 'download').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeTitle}.${ext || 'mp4'}`;

    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.header('Content-Type', 'application/octet-stream');
    
    if (size && size !== 'null' && size !== 'undefined') {
        res.header('Content-Length', size);
    }

    const downloadProcess = spawn('python', [
        '-u', '-m', 'yt_dlp', '-f', formatId,
        '--extractor-args', 'youtube:player_client=android_vr,ios,web',
        '-o', '-', url
    ]);

    downloadProcess.stdout.pipe(res);
    downloadProcess.stderr.on('data', data => console.error(`yt-dlp stderr: ${data}`));
    downloadProcess.on('close', code => {
        if (code !== 0 && !res.headersSent) res.status(500).send('Failed to download');
    });
});

// --- FRONTEND UI ---

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Downloader</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #1e1e2f, #2d2b45); min-height: 100vh; color: #fff; }
        .app-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
        .glass-panel { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 40px; max-width: 600px; width: 100%; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37); text-align: center; }
        .title { margin: 0; font-size: 2.5rem; font-weight: 700; background: linear-gradient(90deg, #ff8a00, #e52e71); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { margin-top: 10px; color: #b3b3c5; font-size: 1.1rem; }
        .input-group { margin-top: 30px; display: flex; gap: 10px; }
        .url-input { flex: 1; padding: 15px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: #fff; font-size: 1rem; outline: none; transition: border-color 0.3s; }
        .url-input:focus { border-color: #ff8a00; }
        .fetch-btn { padding: 15px 25px; border-radius: 12px; border: none; background: linear-gradient(90deg, #ff8a00, #e52e71); color: white; font-weight: 600; font-size: 1rem; cursor: pointer; transition: transform 0.2s, opacity 0.2s; }
        .fetch-btn:hover:not(:disabled) { transform: translateY(-2px); opacity: 0.9; }
        .fetch-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error-message { margin-top: 20px; text-align: left; color: #ff4d4d; background: rgba(255, 77, 77, 0.1); padding: 12px; border-radius: 8px; display: none; }
        .video-card { margin-top: 30px; background: rgba(0, 0, 0, 0.2); border-radius: 16px; padding: 20px; display: none; flex-direction: column; gap: 20px; }
        .video-header { display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .thumbnail { width: 100%; max-width: 300px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
        .video-title { font-size: 1.2rem; margin: 0; line-height: 1.4; }
        .video-duration { font-size: 0.9rem; color: #b3b3c5; margin: 0; }
        .options-container { display: flex; flex-direction: column; gap: 15px; }
        .download-btn { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; font-size: 1rem; cursor: pointer; transition: all 0.3s ease; }
        .download-btn:hover { background: rgba(255,255,255,0.15); transform: scale(1.02); border-color: rgba(255,255,255,0.3); }
        .btn-label { font-weight: 600; }
        .btn-size { background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; color: #ff8a00; }
        @media (max-width: 600px) { .input-group { flex-direction: column; } }
    </style>
</head>
<body>
    <div class="app-container">
        <div class="glass-panel">
            <h1 class="title">Video Downloader</h1>
            <p class="subtitle">Download YouTube videos in a click.</p>
            
            <form id="url-form" class="input-group">
                <input type="text" id="url-input" class="url-input" placeholder="Paste YouTube link here..." required />
                <button type="submit" id="submit-btn" class="fetch-btn">Get Video Info</button>
            </form>

            <div id="error-message" class="error-message"></div>

            <div id="video-card" class="video-card">
                <div class="video-header">
                    <img id="thumbnail" alt="Thumbnail" class="thumbnail" />
                    <h2 id="video-title" class="video-title"></h2>
                    <p id="video-duration" class="video-duration"></p>
                </div>
                <div id="options-container" class="options-container"></div>
            </div>
        </div>
    </div>

    <script>
        let currentUrl = '';
        let currentTitle = '';

        const form = document.getElementById('url-form');
        const submitBtn = document.getElementById('submit-btn');
        const errorMsg = document.getElementById('error-message');
        const videoCard = document.getElementById('video-card');
        const optionsContainer = document.getElementById('options-container');

        const formatSize = (bytes) => {
            if (!bytes) return 'Unknown size';
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputVal = document.getElementById('url-input').value;
            if (!inputVal) return;

            currentUrl = inputVal;
            submitBtn.disabled = true;
            submitBtn.innerText = 'Fetching...';
            errorMsg.style.display = 'none';
            videoCard.style.display = 'none';

            try {
                const res = await fetch(\`/api/info?url=\${encodeURIComponent(currentUrl)}\`);
                const data = await res.json();

                if (!res.ok) throw new Error(data.error || 'Failed to fetch');
                
                currentTitle = data.title;
                document.getElementById('thumbnail').src = data.thumbnail || '';
                document.getElementById('video-title').innerText = data.title;
                document.getElementById('video-duration').innerText = \`Duration: \${data.duration} seconds\`;
                optionsContainer.innerHTML = '';

                data.options.forEach(option => {
                    const btn = document.createElement('button');
                    btn.className = 'download-btn';
                    btn.innerHTML = \`<span class="btn-label">\${option.label}</span><span class="btn-size">\${formatSize(option.sizeBytes)}</span>\`;
                    btn.onclick = () => {
                        const dlUrl = \`/api/download?url=\${encodeURIComponent(currentUrl)}&formatId=\${option.formatId}&ext=\${option.ext}&title=\${encodeURIComponent(currentTitle)}&size=\${option.sizeBytes || ''}\`;
                        window.location.href = dlUrl;
                    };
                    optionsContainer.appendChild(btn);
                });

                if (data.options.length === 0) {
                    optionsContainer.innerHTML = '<p style="color:#b3b3c5;">No compatible formats found.</p>';
                }

                videoCard.style.display = 'flex';
            } catch (err) {
                errorMsg.innerText = err.message;
                errorMsg.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Get Video Info';
            }
        });
    </script>
</body>
</html>`;

app.get('/', (req, res) => {
    res.send(htmlContent);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`To start using it, open your browser and navigate to http://localhost:${PORT}`);
});