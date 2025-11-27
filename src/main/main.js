const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const hostManager = require('./host');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    },
    title: 'Host Editor - Professional Windows hosts file manager',
    icon: path.join(__dirname, '../../public/icon.ico'),
    show: false,
    skipTaskbar: false
  });

  // Set application user model ID for Windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.hosteditor.app');
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Cargar la aplicación Vue
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers para comunicación con el renderer
ipcMain.handle('get-hosts', async () => {
  try {
    return await hostManager.getHosts();
  } catch (error) {
    throw new Error(`Error reading hosts file: ${error.message}`);
  }
});

ipcMain.handle('add-host', async (event, ip, domain, comment, group) => {
  try {
    return await hostManager.addHost(ip, domain, comment, group);
  } catch (error) {
    throw new Error(`Error adding host: ${error.message}`);
  }
});

ipcMain.handle('get-groups', async () => {
  try {
    return await hostManager.getGroups();
  } catch (error) {
    throw new Error(`Error getting groups: ${error.message}`);
  }
});

ipcMain.handle('create-group', async (event, groupName) => {
  try {
    return await hostManager.createGroup(groupName);
  } catch (error) {
    throw new Error(`Error creating group: ${error.message}`);
  }
});

ipcMain.handle('rename-group', async (event, oldName, newName) => {
  try {
    return await hostManager.renameGroup(oldName, newName);
  } catch (error) {
    throw new Error(`Error renaming group: ${error.message}`);
  }
});

ipcMain.handle('delete-group', async (event, groupName) => {
  try {
    return await hostManager.deleteGroup(groupName);
  } catch (error) {
    throw new Error(`Error deleting group: ${error.message}`);
  }
});

ipcMain.handle('move-host-to-group', async (event, ip, domain, newGroup) => {
  try {
    return await hostManager.moveHostToGroup(ip, domain, newGroup);
  } catch (error) {
    throw new Error(`Error moving host to group: ${error.message}`);
  }
});

ipcMain.handle('backup-hosts', async (event, customPath) => {
  try {
    return await hostManager.backupHosts(customPath);
  } catch (error) {
    throw new Error(`Error creating backup: ${error.message}`);
  }
});

ipcMain.handle('remove-host', async (event, ip, domain) => {
  try {
    return await hostManager.removeHost(ip, domain);
  } catch (error) {
    throw new Error(`Error removing host: ${error.message}`);
  }
});

ipcMain.handle('toggle-host', async (event, ip, domain) => {
  try {
    return await hostManager.toggleHost(ip, domain);
  } catch (error) {
    throw new Error(`Error toggling host: ${error.message}`);
  }
});

ipcMain.handle('update-host', async (event, oldIp, oldDomain, newIp, newDomain, comment) => {
  try {
    return await hostManager.updateHost(oldIp, oldDomain, newIp, newDomain, comment);
  } catch (error) {
    throw new Error(`Error updating host: ${error.message}`);
  }
});

ipcMain.handle('validate-ip', async (event, ip) => {
  return hostManager.validateIP(ip);
});

ipcMain.handle('validate-domain', async (event, domain) => {
  return hostManager.validateDomain(domain);
});