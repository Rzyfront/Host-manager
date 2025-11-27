const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras al proceso de renderizado
contextBridge.exposeInMainWorld('electronAPI', {
  // Operaciones con hosts
  getHosts: () => ipcRenderer.invoke('get-hosts'),
  addHost: (ip, domain, comment, group) => ipcRenderer.invoke('add-host', ip, domain, comment, group),
  removeHost: (ip, domain) => ipcRenderer.invoke('remove-host', ip, domain),
  toggleHost: (ip, domain) => ipcRenderer.invoke('toggle-host', ip, domain),
  updateHost: (oldIp, oldDomain, newIp, newDomain, comment) => ipcRenderer.invoke('update-host', oldIp, oldDomain, newIp, newDomain, comment),
  backupHosts: (customPath) => ipcRenderer.invoke('backup-hosts', customPath),

  // Operaciones con grupos
  getGroups: () => ipcRenderer.invoke('get-groups'),
  createGroup: (groupName) => ipcRenderer.invoke('create-group', groupName),
  renameGroup: (oldName, newName) => ipcRenderer.invoke('rename-group', oldName, newName),
  deleteGroup: (groupName) => ipcRenderer.invoke('delete-group', groupName),
  moveHostToGroup: (ip, domain, newGroup) => ipcRenderer.invoke('move-host-to-group', ip, domain, newGroup),

  // Validación
  validateIP: (ip) => ipcRenderer.invoke('validate-ip', ip),
  validateDomain: (domain) => ipcRenderer.invoke('validate-domain', domain),

  // Utilidades
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});