// Electron main process: loads the built Vite app (dist/index.html) into a
// BrowserWindow. The renderer is the same code that runs in the browser, so
// Stockfish (WASM Web Worker) and the Web Speech API work as in Chromium.
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('node:path');
const http = require('node:http');

// Renderer -> main bridge for Ollama. Doing the HTTP call here (Node) avoids the
// CORS block that hits a file:// renderer talking to localhost:11434.
ipcMain.handle('coach:explain', (_event, { model, prompt } = {}) =>
  new Promise((resolve) => {
    const body = JSON.stringify({ model, prompt, stream: false });
    const req = http.request(
      {
        host: '127.0.0.1',
        port: 11434,
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

  // Open external links (e.g. an Ollama doc link added later) in the user's
  // default browser instead of inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
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
