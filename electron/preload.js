const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getChats: () => ipcRenderer.invoke('get-chats'),
  getFolders: () => ipcRenderer.invoke('get-folders'),
  getMessages: (args) => ipcRenderer.invoke('get-messages', args),
  getCountMessages: (chatId) => ipcRenderer.invoke('get-count-messages', chatId),
  searchMessages: (args) => ipcRenderer.invoke('search-messages', args),
  selectFolderPath: () => ipcRenderer.invoke('select-folder-path'),
  processImport: (args) => ipcRenderer.invoke('process-import', args),
  deleteChat: (id) => ipcRenderer.invoke('delete-chat', id),
  resetDatabase: () => ipcRenderer.invoke('reset-database'),
  createFolder: (args) => ipcRenderer.invoke('create-folder', args),
  deleteFolder: (id) => ipcRenderer.invoke('delete-folder', id),
  addChatToFolder: (args) => ipcRenderer.invoke('add-chat-to-folder', args),
  toggleEvidence: (id) => ipcRenderer.invoke('toggle-evidence', id),
  transcribeAudio: (path) => ipcRenderer.invoke('transcribe-audio', path)
});