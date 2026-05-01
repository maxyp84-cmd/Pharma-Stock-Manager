/**
 * Electron main process.
 * The Express+SQLite server runs as a forked Node.js child process so we can
 * pass --experimental-sqlite without touching Electron's own Node flags.
 */
import { app, BrowserWindow, shell, dialog, Menu, Tray, nativeImage } from "electron";
import path from "path";
import { fork, ChildProcess } from "child_process";
import fs from "fs";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverPort = 3000;
let serverProcess: ChildProcess | null = null;

const FRONTEND_PATH = app.isPackaged
  ? path.join(process.resourcesPath, "frontend")
  : path.join(__dirname, "..", "frontend-dev");

// In packaged app, main.js and server-entry.js are both in resources/app/dist/
// In dev, __dirname points to artifacts/desktop/src (tsx) or desktop/dist (esbuild)
const SERVER_SCRIPT = path.join(__dirname, "server-entry.js");

const DB_DIR = (() => {
  try {
    return app.getPath("userData");
  } catch {
    const d = path.join(process.cwd(), ".medistock-data");
    fs.mkdirSync(d, { recursive: true });
    return d;
  }
})();

function startServerProcess(): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = fork(SERVER_SCRIPT, [], {
      execArgv: ["--experimental-sqlite"],
      env: {
        ...process.env,
        MEDISTOCK_DB_DIR: DB_DIR,
        MEDISTOCK_FRONTEND: FRONTEND_PATH,
        MEDISTOCK_PORT: String(serverPort),
      },
      silent: false,
    });

    serverProcess = child;

    child.on("message", (msg: { type: string; port?: number; error?: string }) => {
      if (msg.type === "ready") resolve(msg.port!);
      else if (msg.type === "error") reject(new Error(msg.error));
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) reject(new Error(`Server process exited with code ${code}`));
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: "MediStock — Pharmacy Manager",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    backgroundColor: "#FBF7F0",
  });

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);

  mainWindow.once("ready-to-show", () => {
    mainWindow!.show();
    mainWindow!.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

function createTray() {
  const iconData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABh0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMS42/U4J6AAAAFNJREFUOEdj/P//PwMFmAIxBZgCMQWYAjEFmAIxBZgCMQWYAjEFmAIxBZgCMQWYAjEFmAIxBZgCMQWYAjEFmAIxBZgCMQWYAjEFmAIxBZiCHwAA//8DAApXHwzAi3e0AAAAAElFTkSuQmCC";
  const icon = nativeImage.createFromDataURL(iconData);
  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: "Open MediStock", click: () => { if (!mainWindow) createWindow(); else mainWindow.focus(); } },
    { type: "separator" },
    { label: "Quit", click: () => { app.quit(); } },
  ]);
  tray.setToolTip("MediStock — Pharmacy Manager");
  tray.setContextMenu(menu);
  tray.on("double-click", () => { if (!mainWindow) createWindow(); else mainWindow.focus(); });
}

function setAppMenu() {
  const dbPath = path.join(DB_DIR, "medistock.db");
  const menu = Menu.buildFromTemplate([
    {
      label: "MediStock",
      submenu: [
        { label: "About MediStock", role: "about" },
        { type: "separator" },
        { label: "Quit", accelerator: "CmdOrCtrl+Q", click: () => app.quit() },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Data",
      submenu: [
        {
          label: "Open Database File",
          click: () => shell.showItemInFolder(dbPath),
        },
        {
          label: "Backup Database",
          click: async () => {
            const { filePath } = await dialog.showSaveDialog({
              defaultPath: `medistock-backup-${new Date().toISOString().slice(0, 10)}.db`,
              filters: [{ name: "SQLite Database", extensions: ["db"] }],
            });
            if (filePath) {
              fs.copyFileSync(dbPath, filePath);
              dialog.showMessageBox({ message: "Backup saved successfully!", type: "info" });
            }
          },
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        { label: "Toggle Developer Tools", accelerator: "F12", click: () => mainWindow?.webContents.toggleDevTools() },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

app.on("ready", async () => {
  try {
    setAppMenu();
    serverPort = await startServerProcess();
    console.log(`MediStock server on port ${serverPort}`);
    createWindow();
    createTray();
  } catch (err) {
    dialog.showErrorBox("Startup Error", String(err));
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (!mainWindow) createWindow();
});

app.on("will-quit", () => {
  serverProcess?.kill("SIGTERM");
  tray?.destroy();
});
