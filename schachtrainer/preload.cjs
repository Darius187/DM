// Exposes a minimal, safe bridge so the renderer can ask the main process to
// talk to Ollama. The request runs in the main process (Node), which has no
// CORS restrictions, unlike the file:// renderer.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('coachAPI', {
  explain: (payload) => ipcRenderer.invoke('coach:explain', payload),
  models: () => ipcRenderer.invoke('coach:models'),
});
