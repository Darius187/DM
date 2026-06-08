// Electron main process: loads the built Vite app (dist/index.html) into a
// BrowserWindow. The renderer is the same code that runs in the browser, so
// Stockfish (WASM Web Worker) and the Web Speech API work as in Chromium.
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');

// Parse an "host:port" string (optionally with scheme) into request options.
// Lets the renderer point Ollama at another machine on the network.
function parseHost(host) {
  const s = String(host || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
  const [h, p] = s.split(':');
  return { hostname: h || '127.0.0.1', port: parseInt(p, 10) || 11434 };
}

// Renderer -> main bridge for Ollama. Doing the HTTP call here (Node) avoids the
// CORS block that hits a file:// renderer talking to localhost:11434.
ipcMain.handle('coach:explain', (_event, { model, prompt, host } = {}) =>
  new Promise((resolve) => {
    const { hostname, port } = parseHost(host);
    const body = JSON.stringify({ model, prompt, stream: false });
    const req = http.request(
      {
        host: hostname,
        port,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 60000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            resolve({ ok: false, error: `Ollama HTTP ${res.statusCode}` });
            return;
          }
          try {
            const json = JSON.parse(data);
            resolve({ ok: true, text: (json.response || '').trim() });
          } catch {
            resolve({ ok: false, error: 'Ungültige Antwort von Ollama' });
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('Zeitüberschreitung')));
    req.on('error', (err) => resolve({ ok: false, error: err.code || err.message }));
    req.write(body);
    req.end();
  }),
);

// List installed Ollama models (for the suggestion menu in the renderer).
ipcMain.handle('coach:models', (_event, { host } = {}) =>
  new Promise((resolve) => {
    const { hostname, port } = parseHost(host);
    const req = http.request(
      { host: hostname, port, path: '/api/tags', method: 'GET', timeout: 5000 },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ ok: true, models: (json.models || []).map((m) => m.name).filter(Boolean) });
          } catch {
            resolve({ ok: false, models: [] });
          }
        });
      },
    );
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve({ ok: false, models: [] }));
    req.end();
  }),
);

// Persist small bits of config (saved Ollama connections) to a JSON file in the
// per-user app data directory, so they survive restarts and reinstalls-in-place.
function configPath() {
  return path.join(app.getPath('userData'), 'config.json');
}
ipcMain.handle('config:get', () => {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8'));
  } catch {
    return null;
  }
});
ipcMain.handle('config:set', (_event, data) => {
  try {
    // Merge into the existing config so independent settings (saved
    // connections, chosen voice, ...) do not overwrite one another.
    let current = {};
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
      if (parsed && typeof parsed === 'object') current = parsed;
    } catch {
      /* no config yet */
    }
    fs.writeFileSync(configPath(), JSON.stringify({ ...current, ...data }));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Online text-to-speech via Microsoft Edge's neural voices (edge-tts). Runs in
// the main process because it needs Node (WebSocket to Microsoft's server) and
// to keep the inofficial endpoint details out of the renderer. The renderer
// gets the finished MP3 back as base64 and plays it with an <audio> element.
// rate comes in as a number (1.0 = normal); edge-tts wants a percent string.
function rateToPercent(rate) {
  const r = Number(rate);
  const pct = Math.round(((Number.isFinite(r) && r > 0 ? r : 1) - 1) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}
ipcMain.handle('tts:speak', async (_event, { text, voice, rate } = {}) => {
  if (!text) return { ok: false, error: 'Kein Text übergeben.' };
  const v = voice || 'de-DE-KatjaNeural';
  const tmp = path.join(
    os.tmpdir(),
    `st-tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`,
  );
  try {
    const { EdgeTTS } = require('node-edge-tts');
    const tts = new EdgeTTS({
      voice: v,
      lang: v.slice(0, 5),
      rate: rateToPercent(rate),
      timeout: 15000,
    });
    await tts.ttsPromise(text, tmp);
    const audio = fs.readFileSync(tmp).toString('base64');
    return { ok: true, audio };
  } catch (err) {
    return { ok: false, error: (err && (err.message || String(err))) || 'TTS fehlgeschlagen' };
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* temp file may not exist on early failure */
    }
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 780,
    backgroundColor: '#1e1e1e',
    title: 'Schachtrainer',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // The "Wissen" page opens as its own window (so it can sit beside the board).
  // Everything else (e.g. external doc links) opens in the default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.endsWith('wissen.html')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 600,
          height: 860,
          backgroundColor: '#1c1c1c',
          title: 'Schach-Wissen',
          autoHideMenuBar: true,
          webPreferences: { contextIsolation: true, nodeIntegration: false },
        },
      };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

Menu.setApplicationMenu(null);

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
