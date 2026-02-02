const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectFolderPath: () => ipcRenderer.invoke('select-folder-path'),
  processImport: (data) => ipcRenderer.invoke('process-import', data),
  
  getChats: () => ipcRenderer.invoke('get-chats'),
  // Paginación
  getMessages: (params) => ipcRenderer.invoke('get-messages', params),
  // Buscador
  searchMessages: (data) => ipcRenderer.invoke('search-messages', data),
  
  deleteChat: (chatId) => ipcRenderer.invoke('delete-chat', chatId),
  toggleEvidence: (msgId) => ipcRenderer.invoke('toggle-evidence', msgId),
  transcribeAudio: (filePath) => ipcRenderer.invoke('transcribe-audio', filePath),
  resetDatabase: () => ipcRenderer.invoke('reset-database'),
  
  createFolder: (data) => ipcRenderer.invoke('create-folder', data),
  getFolders: () => ipcRenderer.invoke('get-folders'),
  deleteFolder: (id) => ipcRenderer.invoke('delete-folder', id),
  addChatToFolder: (data) => ipcRenderer.invoke('add-chat-to-folder', data),

  // 🟢 NUEVO: Contar mensajes
  getCountMessages: (chatId) => ipcRenderer.invoke('get-count-messages', chatId)
});