// Exposes a minimal, safe bridge so the renderer can ask the main process to
// talk to Ollama. The request runs in the main process (Node), which has no
// CORS restrictions, unlike the file:// renderer.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('coachAPI', {
  explain: (payload) => ipcRenderer.invoke('coach:explain', payload),
  models: (payload) => ipcRenderer.invoke('coach:models', payload),
});

contextBridge.exposeInMainWorld('configAPI', {
  get: () => ipcRenderer.invoke('config:get'),
  set: (data) => ipcRenderer.invoke('config:set', data),
});

// Online neural voices (edge-tts). speak() returns { ok, audio } where audio is
// a base64 MP3 the renderer plays via an <audio> element.
contextBridge.exposeInMainWorld('ttsAPI', {
  speak: (payload) => ipcRenderer.invoke('tts:speak', payload),
});
