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
  transcribeAudio: (path) => ipcRenderer.invoke('transcribe-audio', path),
  
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  moveChatToFolder: (args) => ipcRenderer.invoke('move-chat-to-folder', args),
  moveFolder: (args) => ipcRenderer.invoke('move-folder', args),

  getAgencyProfile: () => ipcRenderer.invoke('get-agency-profile'),
  saveAgencyProfile: (data) => ipcRenderer.invoke('save-agency-profile', data),
  selectImage: () => ipcRenderer.invoke('select-image'),

  // 🔥 NUEVO: GESTIÓN DE REPORTES 🔥
  getReports: () => ipcRenderer.invoke('get-reports'),
  deleteReportRecord: (id) => ipcRenderer.invoke('delete-report-record', id),

  // Licensing
  getHWID: () => ipcRenderer.invoke('license-get-hwid'),
  activateLicense: (key) => ipcRenderer.invoke('license-activate', { licenseKey: key }),
  checkLicense: () => ipcRenderer.invoke('license-check-status'),
  
  // Reportes
  generateReport: (args) => ipcRenderer.invoke('generate-report', args),
  
  // Admin Panel
  getUsers: () => ipcRenderer.invoke('admin-get-users'),
  deleteUser: (id) => ipcRenderer.invoke('admin-delete-user', id),
  getAuditLogs: () => ipcRenderer.invoke('admin-get-logs'),
  
  // Login
  login: (creds) => ipcRenderer.invoke('auth-login', creds),

  // 🔥 NUEVO: GESTIÓN DE EQUIPO INSTITUCIONAL 🔥
  getTeam: (parentId) => ipcRenderer.invoke('get-team', parentId),
  inviteMember: (data) => ipcRenderer.invoke('invite-member', data),
  revokeMember: (id) => ipcRenderer.invoke('revoke-member', id)
});