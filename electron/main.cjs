const { app, BrowserWindow, shell } = require("electron");
const http = require("node:http");
const next = require("next");
const path = require("node:path");

let mainWindow = null;
let server = null;

function isExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function startDesktopApp() {
  if (app.isPackaged) {
    process.env.NODE_ENV = "production";
  }

  const appRoot = path.resolve(__dirname, "..");
  const nextApp = next({ dev: false, dir: appRoot, hostname: "127.0.0.1", port: 0 });
  const requestHandler = nextApp.getRequestHandler();

  await nextApp.prepare();

  server = http.createServer((request, response) => {
    requestHandler(request, response);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 3000;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#f8fafc",
    show: false,
    autoHideMenuBar: true,
    title: "LocalPDF Engine",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }

    return { action: "allow" };
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}`);
}

app.whenReady().then(startDesktopApp).catch((error) => {
  console.error("Failed to start LocalPDF Engine desktop app:", error);
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void startDesktopApp();
  }
});

app.on("window-all-closed", () => {
  if (server) {
    server.close();
    server = null;
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (server) {
    server.close();
    server = null;
  }
});
