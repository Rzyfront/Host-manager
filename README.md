# Host Manager

Un editor de archivos hosts para Windows construido con Electron + Vue.js.

## 📥 Descargar para Windows

### 🚀 Última Versión Estable (LTS)

[![Descargar Host Manager](https://img.shields.io/badge/Descargar-Host_Manager_LTS-blue?style=for-the-badge&logo=windows)](https://github.com/Rzyfront/Host-manager/releases/download/LTS/host-manager-win32-x64.zip)

**Descarga directa:** [host-manager-win32-x64.zip](https://github.com/Rzyfront/Host-manager/releases/download/LTS/host-manager-win32-x64.zip)

### Instrucciones de instalación:
1. Descarga el archivo ZIP de arriba
2. Extrae el contenido en una carpeta de tu elección
3. Ejecuta `host-manager.exe` (requiere permisos de administrador)
4. ¡Listo! Ya puedes gestionar tu archivo hosts

---

## Características

- ✅ Interfaz moderna y responsiva con Vue 3
- ✅ Agregar, eliminar y visualizar entradas de hosts
- ✅ Validación de IPs y dominios
- ✅ Backup automático del archivo hosts
- ✅ Organización por grupos
- ✅ Renombrar y eliminar grupos (con confirmación)
- ✅ Requiere permisos de administrador
- ✅ Genera ejecutable .exe para Windows

## Requisitos

- Node.js 16+
- npm o yarn
- Windows (para ejecutar el archivo .exe)

## Instalación

```bash
# Clonar el repositorio
git clone git@github.com:Rzyfront/Host-manager.git
cd host-manager

# Instalar dependencias
npm install
```

## Desarrollo

```bash
# Ejecutar en modo desarrollo
npm run dev
```

## Construir para producción

```bash
# Generar ejecutable .exe
npm run dist
```

El ejecutable se generará en la carpeta `dist/`.

## Estructura del proyecto

```
host-manager/
├── src/
│   ├── main/           # Proceso principal de Electron
│   │   ├── main.js     # Archivo principal
│   │   └── host.js     # Lógica para manipular hosts
│   ├── renderer/       # Proceso de renderizado (Vue)
│   │   └── index.html  # Interfaz de usuario
│   └── preload/        # Preload script
│       └── preload.js  # Comunicación segura
├── public/             # Recursos estáticos
├── package.json
└── electron-builder.json
```

## Uso

1. Ejecuta la aplicación (requiere permisos de administrador)
2. Agrega nuevas entradas de hosts con IP y dominio
3. Organiza hosts en grupos
4. Renombra o elimina grupos según necesites
5. Visualiza y elimina hosts existentes
6. Crea backups automáticos antes de modificar

## Seguridad

- La aplicación requiere permisos de administrador para modificar el archivo hosts
- Se crean backups automáticos antes de cada modificación
- Validación de entrada para prevenir configuraciones incorrectas

## Licencia

MIT