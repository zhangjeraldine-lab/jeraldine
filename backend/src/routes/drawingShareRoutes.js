import crypto from 'crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';

const MAX_DRAWING_BYTES = Number(process.env.MAX_DRAWING_BYTES) || 12 * 1024 * 1024;
const SHARE_TITLE = '邀请你鉴赏layover全球画廊';
const SHARE_DESCRIPTION = '打开 layover 全球画廊，收藏这一刻的共创画作。';
const drawings = new Map();

const cleanText = (value, max = 240) => String(value || '').trim().slice(0, max);

const normalizeStoryMetadata = (story) => {
  if (!story || typeof story !== 'object') return null;

  const localized = {};
  if (story.localized && typeof story.localized === 'object') {
    Object.entries(story.localized).slice(0, 8).forEach(([lang, item]) => {
      if (!item || typeof item !== 'object') return;
      const code = cleanText(lang, 12).toLowerCase();
      if (!code) return;
      localized[code] = {
        title: cleanText(item.title, 80),
        story: cleanText(item.story, 600),
      };
    });
  }

  const normalized = {
    storyZh: cleanText(story.storyZh, 600),
    storyEn: cleanText(story.storyEn, 600),
    localized,
  };

  return normalized.storyZh || normalized.storyEn || Object.keys(localized).length
    ? normalized
    : null;
};

const normalizeDrawingMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') return null;

  const generated = metadata.generated && typeof metadata.generated === 'object'
    ? {
        id: cleanText(metadata.generated.id, 80),
        title: cleanText(metadata.generated.title, 100),
        provider: cleanText(metadata.generated.provider, 40),
        model: cleanText(metadata.generated.model, 80),
      }
    : null;

  const languages = Array.isArray(metadata.languages)
    ? metadata.languages.map((lang) => cleanText(lang, 12).toLowerCase()).filter(Boolean).slice(0, 8)
    : [];

  return {
    type: metadata.type === 'solo' ? 'solo' : 'co',
    source: cleanText(metadata.source, 40) || 'canvas',
    title: cleanText(metadata.title, 100),
    story: normalizeStoryMetadata(metadata.story),
    generated,
    languages,
  };
};

const detectLanIp = () => {
  const ifaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, list] of Object.entries(ifaces)) {
    for (const info of list || []) {
      if (info.family !== 'IPv4' || info.internal) continue;

      const address = info.address;
      const ifaceName = name.toLowerCase();
      const isPrivate =
        address.startsWith('10.') ||
        address.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(address);
      const isLinkLocal = address.startsWith('169.254.');
      const isBenchmarkNet = /^198\.(18|19)\./.test(address);
      const isLikelyPhysical = /(wlan|wi-?fi|wireless|ethernet|以太网)/i.test(name);
      const isLikelyVirtual = /(tunnel|virtual|vnic|vmware|vbox|docker|wsl|meta|loopback)/i.test(name);

      if (isLinkLocal || isBenchmarkNet) continue;

      candidates.push({
        address,
        score: (isPrivate ? 100 : 0) + (isLikelyPhysical ? 40 : 0) - (isLikelyVirtual ? 80 : 0) - ifaceName.length / 100,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.address || null;
};

const cachedLanIp = detectLanIp();

const normalizeBaseUrl = (value) => value.replace(/\/+$/, '');

export const getDrawingShareBase = (port = process.env.PORT || 3001) => {
  if (process.env.PUBLIC_BASE_URL) return normalizeBaseUrl(process.env.PUBLIC_BASE_URL);
  if (cachedLanIp) return `http://${cachedLanIp}:${port}`;
  return `http://localhost:${port}`;
};

const publicBaseUrl = (req, port) => {
  if (process.env.PUBLIC_BASE_URL) return normalizeBaseUrl(process.env.PUBLIC_BASE_URL);
  if (cachedLanIp) return `http://${cachedLanIp}:${port}`;

  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = forwardedHost || req.get('host') || `localhost:${port}`;
  return `${protocol}://${host}`;
};

const parseDataUrl = (dataUrl) => {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i.exec(dataUrl || '');
  if (!match) return null;

  try {
    return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
  } catch {
    return null;
  }
};

const normalizeDrawingId = (id) => {
  const value = String(id || '').trim().toLowerCase();
  return /^[a-f0-9]{12}$/.test(value) ? value : null;
};

const mimeToExt = (mime) => {
  switch (mime) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/svg+xml':
      return 'svg';
    case 'image/png':
    default:
      return 'png';
  }
};

const drawingPaths = (storageDir, id, mime = 'image/png') => {
  const ext = mimeToExt(mime);
  return {
    image: path.join(storageDir, `${id}.${ext}`),
    meta: path.join(storageDir, `${id}.json`),
  };
};

const saveDrawingToDisk = (storageDir, id, entry) => {
  mkdirSync(storageDir, { recursive: true });
  const paths = drawingPaths(storageDir, id, entry.mime);
  writeFileSync(paths.image, entry.buffer);
  writeFileSync(paths.meta, JSON.stringify({
    id,
    mime: entry.mime,
    file: path.basename(paths.image),
    createdAt: entry.createdAt,
    metadata: entry.metadata || null,
  }, null, 2));
};

const loadDrawingFromDisk = (storageDir, id) => {
  const safeId = normalizeDrawingId(id);
  if (!safeId) return null;

  const cached = drawings.get(safeId);
  if (cached) return cached;

  const metaPath = path.join(storageDir, `${safeId}.json`);
  if (!existsSync(metaPath)) return null;

  try {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    const imagePath = path.join(storageDir, path.basename(meta.file || `${safeId}.${mimeToExt(meta.mime)}`));
    if (!existsSync(imagePath)) return null;

    const entry = {
      buffer: readFileSync(imagePath),
      mime: meta.mime || 'image/png',
      createdAt: Number(meta.createdAt) || Date.now(),
      metadata: meta.metadata || null,
    };
    drawings.set(safeId, entry);
    return entry;
  } catch (error) {
    console.error(`Failed to load drawing ${safeId}:`, error.message);
    return null;
  }
};

const drawingPayload = (req, id, entry, port) => {
  const base = publicBaseUrl(req, port);
  const createdAt = entry.createdAt;

  return {
    id,
    url: `${base}/m/${id}`,
    mobileUrl: `${base}/m/${id}`,
    viewerUrl: `${base}/d/${id}`,
    imageUrl: `${base}/api/drawings/${id}/image`,
    createdAt: new Date(createdAt).toISOString(),
    permanent: true,
    mime: entry.mime,
    metadata: normalizeDrawingMetadata(entry.metadata),
  };
};

const listDrawingsFromDisk = (storageDir, limit = 48) => {
  try {
    return readdirSync(storageDir)
      .map((file) => normalizeDrawingId(file.replace(/\.json$/i, '')))
      .filter(Boolean)
      .map((id) => ({ id, entry: loadDrawingFromDisk(storageDir, id) }))
      .filter(({ entry }) => entry)
      .sort((a, b) => b.entry.createdAt - a.entry.createdAt)
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to list drawings:', error.message);
    return [];
  }
};

const fallbackViewerHtml = (id) => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=2" />
<title>Co-Drawing</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f7fbfa; color: #071120; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  main { max-width: 560px; margin: 0 auto; padding: 28px 20px 64px; text-align: center; }
  h1 { font-size: 1.45rem; margin: 0 0 8px; }
  p { color: #70808b; }
  .frame { padding: 12px; background: #fff; border: 1px solid rgba(7,17,32,0.1); border-radius: 8px; box-shadow: 0 18px 48px rgba(18,44,54,0.12); }
  img { display: block; width: 100%; height: auto; border-radius: 6px; }
  a { display: block; margin-top: 16px; padding: 14px 18px; border-radius: 999px; background: #079aa5; color: #fff; text-decoration: none; font-weight: 800; }
</style>
</head>
<body>
<main>
  <h1>你的共创画作</h1>
  <p>Long-press the image to save</p>
  <div class="frame"><img src="/api/drawings/${id}/image" alt="Co-drawing" /></div>
  <a href="/api/drawings/${id}/image" download="layover-drawing.png">下载图片 · Download</a>
</main>
</body>
</html>`;

const notFoundHtml = () => '<h1>Not found</h1><p>Drawing link not found.</p>';

const mobileShareHtml = (req, indexPath, id, port) => {
  const base = publicBaseUrl(req, port);
  const pageUrl = `${base}/m/${encodeURIComponent(id)}`;
  const shareImageUrl = `${base}/api/drawings/${encodeURIComponent(id)}/image`;
  const logoUrl = `${base}/mobile/assets/layover-logo.svg`;

  return readFileSync(indexPath, 'utf8')
    .replaceAll('/mobile/assets/layover-share.png', shareImageUrl)
    .replaceAll('/mobile/assets/layover-logo.svg', logoUrl)
    .replace(
      '<head>',
      `<head>
  <meta property="og:url" content="${pageUrl}" />
  <meta name="wechat:title" content="${SHARE_TITLE}" />
  <meta name="wechat:description" content="${SHARE_DESCRIPTION}" />
  <meta name="wechat:image" content="${shareImageUrl}" />`
    );
};

const registerDrawingShareRoutes = (app, options = {}) => {
  const port = options.port || process.env.PORT || 3001;
  const storageDir = path.resolve(
    options.storageDir || process.env.DRAWING_STORAGE_PATH || path.join(process.cwd(), 'data/drawings')
  );
  const mobileAppDir = options.mobileAppDir ? path.resolve(options.mobileAppDir) : null;
  const mobileIndexPath = mobileAppDir ? path.join(mobileAppDir, 'index.html') : null;
  const hasMobileApp = Boolean(mobileIndexPath && existsSync(mobileIndexPath));

  mkdirSync(storageDir, { recursive: true });

  if (hasMobileApp) {
    app.use('/m', express.static(mobileAppDir, { index: false }));
    app.use('/mobile', express.static(mobileAppDir));
    app.get('/m/:id', (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(mobileShareHtml(req, mobileIndexPath, req.params.id, port));
    });
  } else if (mobileAppDir) {
    console.warn(`Mobile app directory not found: ${mobileAppDir}`);
  }

  app.post('/api/drawings', (req, res) => {
    const decoded = parseDataUrl(req.body?.imageData);
    if (!decoded) return res.status(400).json({ error: 'invalid imageData' });
    if (decoded.buffer.length > MAX_DRAWING_BYTES) {
      return res.status(413).json({ error: 'image too large' });
    }

    let id = crypto.randomBytes(6).toString('hex');
    while (existsSync(path.join(storageDir, `${id}.json`)) || drawings.has(id)) {
      id = crypto.randomBytes(6).toString('hex');
    }

    const entry = {
      buffer: decoded.buffer,
      mime: decoded.mime,
      createdAt: Date.now(),
      metadata: normalizeDrawingMetadata(req.body?.metadata),
    };
    drawings.set(id, entry);
    saveDrawingToDisk(storageDir, id, entry);

    return res.json(drawingPayload(req, id, entry, port));
  });

  app.get('/api/drawings', (req, res) => {
    const parsedLimit = Number(req.query?.limit);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(100, Math.max(1, Math.floor(parsedLimit)))
      : 48;
    const items = listDrawingsFromDisk(storageDir, limit)
      .map(({ id, entry }) => drawingPayload(req, id, entry, port));

    return res.json({ items });
  });

  app.get('/api/drawings/:id', (req, res) => {
    const id = normalizeDrawingId(req.params.id);
    const entry = loadDrawingFromDisk(storageDir, id);
    if (!id || !entry) return res.status(404).json({ error: 'drawing not found' });
    return res.json(drawingPayload(req, id, entry, port));
  });

  app.get('/api/drawings/:id/image', (req, res) => {
    const id = normalizeDrawingId(req.params.id);
    const entry = loadDrawingFromDisk(storageDir, id);
    if (!entry) return res.status(404).send('not found');
    res.setHeader('Content-Type', entry.mime || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', 'inline; filename="layover-drawing.png"');
    return res.send(entry.buffer);
  });

  app.get('/d/:id', (req, res) => {
    const id = normalizeDrawingId(req.params.id);
    if (!id || !loadDrawingFromDisk(storageDir, id)) return res.status(404).send(notFoundHtml());
    if (hasMobileApp) return res.redirect(302, `/m/${id}`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(fallbackViewerHtml(id));
  });

  return {
    shareBase: getDrawingShareBase(port),
    storageDir,
    permanent: true,
  };
};

export default registerDrawingShareRoutes;
