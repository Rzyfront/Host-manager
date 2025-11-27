const fs = require('fs');
const path = require('path');
const os = require('os');

class HostManager {
  constructor() {
    this.hostsPath = process.platform === 'win32'
      ? path.join(process.env.SYSTEMROOT || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts')
      : '/etc/hosts';

    this.backupDir = path.join(os.homedir(), '.host-editor', 'backups');
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async getHosts() {
    try {
      const content = fs.readFileSync(this.hostsPath, 'utf8');
      const hosts = [];
      let currentGroup = null;

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Detectar inicio de grupo (exacto)
        if (trimmedLine.startsWith('---[') && trimmedLine.includes(']---') && !trimmedLine.includes('>')) {
          const match = trimmedLine.match(/\[([^\]]+)\]/);
          if (match) {
            currentGroup = match[1];
            continue;
          }
        }

        // Detectar fin de grupo (exacto)
        // Formato nuevo: ---[>NombreGrupo<]---
        if (trimmedLine.startsWith('---[>') && trimmedLine.includes('<]---')) {
          currentGroup = null;
          continue;
        }

        // Compatibilidad con formato antiguo
        if (trimmedLine.startsWith('-------------------------------------------')) {
          currentGroup = null;
          continue;
        }

        // Ignorar líneas vacías
        if (trimmedLine === '') {
          continue;
        }

        // Parsear línea de host (incluyendo comentados)
        const isCommented = trimmedLine.startsWith('#');
        const cleanLine = isCommented ? trimmedLine.substring(1).trim() : trimmedLine;

        const parts = cleanLine.split(/\s+/);
        if (parts.length >= 2) {
          const ip = parts[0];
          const domain = parts[1];
          const comment = parts.slice(2).join(' ') || '';

          hosts.push({
            ip,
            domain,
            comment,
            isActive: !isCommented,
            originalLine: line,
            isCommented,
            group: currentGroup || 'Default'
          });
        }
      }

      return hosts;
    } catch (error) {
      throw new Error(`Failed to read hosts file: ${error.message}`);
    }
  }

  async getGroups() {
    try {
      const content = fs.readFileSync(this.hostsPath, 'utf8');
      const groups = [];
      let currentGroup = null;
      let groupHosts = [];

      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Detectar inicio de grupo (exacto)
        if (trimmedLine.startsWith('---[') && trimmedLine.includes(']---') && !trimmedLine.includes('>')) {
          const match = trimmedLine.match(/\[([^\]]+)\]/);
          if (match) {
            // Guardar grupo anterior si existe
            if (currentGroup) {
              groups.push({
                name: currentGroup,
                hosts: groupHosts,
                activeCount: groupHosts.filter(h => h.isActive).length
              });
            }

            currentGroup = match[1];
            groupHosts = [];
            continue;
          }
        }

        // Detectar fin de grupo (exacto)
        const isEndGroup = (trimmedLine.startsWith('---[>') && trimmedLine.includes('<]---')) ||
          trimmedLine.startsWith('-------------------------------------------');

        if (isEndGroup) {
          // Guardar grupo actual si existe
          if (currentGroup) {
            groups.push({
              name: currentGroup,
              hosts: groupHosts,
              activeCount: groupHosts.filter(h => h.isActive).length
            });
          }

          currentGroup = null;
          groupHosts = [];
          continue;
        }

        // Ignorar líneas vacías
        if (trimmedLine === '') {
          continue;
        }

        // Parsear línea de host (incluyendo comentados)
        const isCommented = trimmedLine.startsWith('#');
        const cleanLine = isCommented ? trimmedLine.substring(1).trim() : trimmedLine;

        const parts = cleanLine.split(/\s+/);
        if (parts.length >= 2) {
          const ip = parts[0];
          const domain = parts[1];
          const comment = parts.slice(2).join(' ') || '';

          const host = {
            ip,
            domain,
            comment,
            isActive: !isCommented,
            originalLine: line,
            isCommented,
            group: currentGroup || 'Default'
          };

          if (currentGroup) {
            groupHosts.push(host);
          }
        }
      }

      // Agregar último grupo si existe
      if (currentGroup) {
        groups.push({
          name: currentGroup,
          hosts: groupHosts,
          activeCount: groupHosts.filter(h => h.isActive).length
        });
      }

      // Agregar grupo Default con hosts sin grupo
      const allHosts = await this.getHosts();
      const defaultHosts = allHosts.filter(host => host.group === 'Default');
      if (defaultHosts.length > 0 && !groups.some(g => g.name === 'Default')) {
        groups.push({
          name: 'Default',
          hosts: defaultHosts,
          activeCount: defaultHosts.filter(h => h.isActive).length
        });
      }

      return groups.length > 0 ? groups : [{
        name: 'Default',
        hosts: defaultHosts,
        activeCount: defaultHosts.filter(h => h.isActive).length
      }];
    } catch (error) {
      throw new Error(`Failed to get groups: ${error.message}`);
    }
  }

  async createGroup(groupName) {
    try {
      // Crear backup antes de modificar
      await this.backupHosts();

      const content = fs.readFileSync(this.hostsPath, 'utf8');
      const lines = content.split('\n');

      // Verificar si el grupo ya existe
      const groups = await this.getGroups();
      if (groups.some(g => g.name === groupName)) {
        throw new Error('Group already exists');
      }

      // Agregar nuevo grupo al final con formato claro
      lines.push('');
      lines.push(`---[${groupName}]---`);
      lines.push('');
      lines.push(`---[>${groupName}<]---`);

      fs.writeFileSync(this.hostsPath, lines.join('\n'), 'utf8');

      return { success: true, message: 'Group created successfully' };
    } catch (error) {
      throw new Error(`Failed to create group: ${error.message}`);
    }
  }

  async addHost(ip, domain, comment = '', group = 'Default') {
    try {
      // Validar IP y dominio
      if (!this.validateIP(ip)) {
        throw new Error('Invalid IP address');
      }

      if (!this.validateDomain(domain)) {
        throw new Error('Invalid domain name');
      }

      // Crear backup antes de modificar
      await this.backupHosts();

      // Leer contenido actual
      const content = fs.readFileSync(this.hostsPath, 'utf8');
      const lines = content.split('\n');

      // Verificar si el host ya existe (incluyendo comentados)
      const hosts = await this.getHosts();
      const existingHost = hosts.find(host => host.ip === ip && host.domain === domain);
      if (existingHost) {
        throw new Error('Host entry already exists');
      }

      // Encontrar la posición correcta para insertar el host
      let insertIndex = lines.length;

      if (group !== 'Default') {
        // Buscar el grupo especificado
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith(`---[${group}]---`)) {
            // Encontrar el final del grupo
            for (let j = i + 1; j < lines.length; j++) {
              const nextLine = lines[j].trim();
              if (nextLine.startsWith('---[') || nextLine.startsWith('-------------------------------------------')) {
                insertIndex = j;
                break;
              }
            }
            break;
          }
        }
      }

      // Agregar nueva entrada
      const newLine = comment
        ? `${ip}\t${domain}\t# ${comment}`
        : `${ip}\t${domain}`;

      lines.splice(insertIndex, 0, newLine);

      // Escribir archivo modificado
      fs.writeFileSync(this.hostsPath, lines.join('\n'), 'utf8');

      return { success: true, message: 'Host added successfully' };
    } catch (error) {
      throw new Error(`Failed to add host: ${error.message}`);
    }
  }

  async removeHost(ip, domain) {
    try {
      // Crear backup antes de modificar
      await this.backupHosts();

      // Leer contenido actual
      const content = fs.readFileSync(this.hostsPath, 'utf8');
      const lines = content.split('\n');

      // Encontrar y eliminar la línea del host (incluyendo comentados)
      let removed = false;
      const newLines = lines.filter(line => {
        const trimmedLine = line.trim();
        if (trimmedLine === '') {
          return true;
        }

        const isCommented = trimmedLine.startsWith('#');
        const cleanLine = isCommented ? trimmedLine.substring(1).trim() : trimmedLine;
        const parts = cleanLine.split(/\s+/);

        if (parts.length >= 2) {
          const lineIp = parts[0];
          const lineDomain = parts[1];

          if (lineIp === ip && lineDomain === domain) {
            removed = true;
            return false;
          }
        }

        return true;
      });

      if (!removed) {
        throw new Error('Host entry not found');
      }

      // Escribir archivo modificado
      fs.writeFileSync(this.hostsPath, newLines.join('\n'), 'utf8');

      return { success: true, message: 'Host removed successfully' };
    } catch (error) {
      throw new Error(`Failed to remove host: ${error.message}`);
    }
  }

  async toggleHost(ip, domain) {
    try {
      // Crear backup antes de modificar
      await this.backupHosts();

      // Leer contenido actual
      const content = fs.readFileSync(this.hostsPath, 'utf8');
      const lines = content.split('\n');

      // Encontrar y modificar la línea del host
      let toggled = false;
      const newLines = lines.map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine === '') {
          return line;
        }

        const isCommented = trimmedLine.startsWith('#');
        const cleanLine = isCommented ? trimmedLine.substring(1).trim() : trimmedLine;
        const parts = cleanLine.split(/\s+/);

        if (parts.length >= 2) {
          const lineIp = parts[0];
          const lineDomain = parts[1];

          if (lineIp === ip && lineDomain === domain) {
            toggled = true;
            if (isCommented) {
              // Activar: quitar el comentario
              return cleanLine;
            } else {
              // Desactivar: agregar comentario
              return `#${line}`;
            }
          }
        }

        return line;
      });

      if (!toggled) {
        throw new Error('Host entry not found');
      }

      // Escribir archivo modificado
      fs.writeFileSync(this.hostsPath, newLines.join('\n'), 'utf8');

      return { success: true, message: 'Host toggled successfully' };
    } catch (error) {
      throw new Error(`Failed to toggle host: ${error.message}`);
    }
  }

  async updateHost(oldIp, oldDomain, newIp, newDomain, comment = '') {
    try {
      // Validar IP y dominio
      if (!this.validateIP(newIp)) {
        throw new Error('Invalid IP address');
      }

      if (!this.validateDomain(newDomain)) {
        throw new Error('Invalid domain name');
      }

      // Crear backup antes de modificar
      await this.backupHosts();

      // Leer contenido actual
      const content = fs.readFileSync(this.hostsPath, 'utf8');
      const lines = content.split('\n');

      // Encontrar y modificar la línea del host
      let updated = false;
      const newLines = lines.map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine === '') {
          return line;
        }

        const isCommented = trimmedLine.startsWith('#');
        const cleanLine = isCommented ? trimmedLine.substring(1).trim() : trimmedLine;
        const parts = cleanLine.split(/\s+/);

        if (parts.length >= 2) {
          const lineIp = parts[0];
          const lineDomain = parts[1];

          if (lineIp === oldIp && lineDomain === oldDomain) {
            updated = true;
            const newLine = comment
              ? `${newIp}\t${newDomain}\t# ${comment}`
              : `${newIp}\t${newDomain}`;

            return isCommented ? `#${newLine}` : newLine;
          }
        }

        return line;
      });

      if (!updated) {
        throw new Error('Host entry not found');
      }

      // Escribir archivo modificado
      fs.writeFileSync(this.hostsPath, newLines.join('\n'), 'utf8');

      return { success: true, message: 'Host updated successfully' };
    } catch (error) {
      throw new Error(`Failed to update host: ${error.message}`);
    }
  }

  async moveHostToGroup(ip, domain, newGroup) {
    try {
      // Crear backup antes de modificar
      await this.backupHosts();

      // Leer contenido actual
      const content = fs.readFileSync(this.hostsPath, 'utf8');
      const lines = content.split('\n');

      // Encontrar y eliminar el host actual
      let hostLine = null;
      let hostIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        const trimmedLine = lines[i].trim();
        if (trimmedLine === '') continue;

        const isCommented = trimmedLine.startsWith('#');
        const cleanLine = isCommented ? trimmedLine.substring(1).trim() : trimmedLine;
        const parts = cleanLine.split(/\s+/);

        if (parts.length >= 2) {
          const lineIp = parts[0];
          const lineDomain = parts[1];

          if (lineIp === ip && lineDomain === domain) {
            hostLine = lines[i];
            hostIndex = i;
            break;
          }
        }
      }

      if (hostIndex === -1) {
        throw new Error('Host entry not found');
      }

      // Eliminar la línea actual
      lines.splice(hostIndex, 1);

      // Encontrar la posición correcta para insertar en el nuevo grupo
      let insertIndex = lines.length;

      if (newGroup !== 'Default') {
        // Buscar el grupo especificado
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith(`---[${newGroup}]---`)) {
            // Encontrar el final del grupo
            for (let j = i + 1; j < lines.length; j++) {
              const nextLine = lines[j].trim();
              if (nextLine.startsWith('---[') || nextLine.startsWith('-------------------------------------------')) {
                insertIndex = j;
                break;
              }
            }
            break;
          }
        }
      }

      // Insertar el host en la nueva posición
      lines.splice(insertIndex, 0, hostLine);

      // Escribir archivo modificado
      fs.writeFileSync(this.hostsPath, lines.join('\n'), 'utf8');

      return { success: true, message: 'Host moved to group successfully' };
    } catch (error) {
      throw new Error(`Failed to move host to group: ${error.message}`);
    }
  }

  async backupHosts(customPath = null) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = customPath || path.join(this.backupDir, `hosts-${timestamp}.backup`);

      // Si es una ruta personalizada, asegurarse de que el directorio exista
      if (customPath) {
        const dir = path.dirname(backupFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      fs.copyFileSync(this.hostsPath, backupFile);

      // Mantener solo los últimos 10 backups en el directorio por defecto
      if (!customPath) {
        await this.cleanupOldBackups();
      }

      return {
        success: true,
        message: 'Backup created successfully',
        backupFile
      };
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.backup'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          time: fs.statSync(path.join(this.backupDir, file)).mtime
        }))
        .sort((a, b) => b.time - a.time);

      // Eliminar backups antiguos (mantener solo los últimos 10)
      if (files.length > 10) {
        const filesToDelete = files.slice(10);
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  validateIP(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  validateDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain) && domain.length <= 253;
  }
  async renameGroup(oldName, newName) {
    try {
      if (!newName || !newName.trim()) {
        throw new Error('New group name cannot be empty');
      }

      const content = await fs.promises.readFile(this.hostsPath, 'utf8');
      const lines = content.split('\n');
      const newLines = [];
      let groupFound = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (trimmedLine === `---[${oldName}]---`) {
          newLines.push(`---[${newName}]---`);
          groupFound = true;
        } else if (trimmedLine === `---[>${oldName}<]---`) {
          newLines.push(`---[>${newName}<]---`);
        } else {
          newLines.push(line);
        }
      }

      if (!groupFound) {
        throw new Error(`Group "${oldName}" not found`);
      }

      await fs.promises.writeFile(this.hostsPath, newLines.join('\n'), 'utf8');
      return { success: true };
    } catch (error) {
      console.error('Error renaming group:', error);
      throw error;
    }
  }

  async deleteGroup(groupName) {
    try {
      const content = await fs.promises.readFile(this.hostsPath, 'utf8');
      const lines = content.split('\n');
      const newLines = [];
      let insideGroup = false;
      let groupFound = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Detect start of target group
        if (trimmedLine === `---[${groupName}]---`) {
          insideGroup = true;
          groupFound = true;
          continue; // Skip this line
        }

        // Detect end of target group
        if (insideGroup && (trimmedLine === `---[>${groupName}<]---` || trimmedLine === '-------------------------------------------')) {
          insideGroup = false;
          continue; // Skip this line
        }

        // If not inside the group being deleted, keep the line
        if (!insideGroup) {
          newLines.push(line);
        }
      }

      if (!groupFound) {
        throw new Error(`Group "${groupName}" not found`);
      }

      await fs.promises.writeFile(this.hostsPath, newLines.join('\n'), 'utf8');
      return { success: true };
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }
}

module.exports = new HostManager();