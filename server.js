/**
 * XANIMEHUB — JIYYAD TOOLS
 * Proxy Samehadaku API (Zyvor)
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const API = process.env.ANIME_API || 'https://api.zyvor.my.id/api/anime/samehadaku';

app.use(cors());
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

async function samehadaku(body) {
  const { data } = await axios.post(API, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000,
    validateStatus: () => true,
  });
  return data;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'XANIMEHUB', brand: 'JIYYAD TOOLS' });
});

app.post('/api/anime', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.action) return res.status(400).json({ status: false, error: 'action required' });
    const data = await samehadaku(body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ status: false, error: e.message || 'API error' });
  }
});

// proxy direct video if needed
app.get('/api/proxy', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url || !/^https?:\/\//i.test(String(url))) return res.status(400).send('Invalid url');
    const range = req.headers.range;
    const upstream = await axios.get(url, {
      responseType: 'stream',
      timeout: 60000,
      validateStatus: () => true,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Referer: 'https://samehadaku.li/',
        ...(range ? { Range: range } : {}),
      },
    });
    res.status(upstream.status);
    ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach((h) => {
      if (upstream.headers[h]) res.setHeader(h, upstream.headers[h]);
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    upstream.data.pipe(res);
  } catch (e) {
    res.status(502).json({ error: e.message || 'proxy failed' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`XANIMEHUB — JIYYAD TOOLS → http://localhost:${PORT}`);
});
