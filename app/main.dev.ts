/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import winston from 'winston';
import request from 'request';
import MenuBuilder from './menu';

const expressAppUrl = 'http://127.0.0.1:4242/';

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: path.join(app.getPath('userData'), 'main.dev.log'),
      options: { flags: 'w' }
    })
  ]
});

logger.info('Winston checking in for duty.');

process.on('uncaughtException', logger.info);
process.on('unhandledRejection', logger.info);

// require('./server/server');

const { startServers } = require('./server/backend.lib');

startServers({
  userDataPath: app.getPath('userData')
});

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let loadingWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

// if (
//   process.env.NODE_ENV === 'development' ||
//   process.env.DEBUG_PROD === 'true'
// ) {
// require('electron-debug')();
// }

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(logger.info);
};

const createWindow = async () => {
  // if (
  //   process.env.NODE_ENV === 'development' ||
  //   process.env.DEBUG_PROD === 'true'
  // ) {
  // await installExtensions();
  // }

  loadingWindow = new BrowserWindow({
    width: 420,
    height: 420,
    show: false,
    frame: false,
    transparent: true
  });

  loadingWindow.loadURL(`file://${__dirname}/loading.html`);

  loadingWindow.webContents.on('did-finish-load', () => {
    logger.info('loadingwindow did finish load');
    if (!loadingWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      loadingWindow.minimize();
    } else {
      loadingWindow.show();
      loadingWindow.focus(); // ?
    }

    // start checking for express

    const checkServerRunning = setInterval(() => {
      request(expressAppUrl, (error: any, response: any, body: any) => {
        logger.info('in check server running');
        if (!error && response.statusCode === 200) {
          clearInterval(checkServerRunning);
          logger.info('server is now running');
          if (mainWindow) {
            mainWindow.loadURL(`file://${__dirname}/app.html`);
          } else {
            logger.info('ERROR: mainWindow not found.');
          }
        }
      });
    }, 1000);
  });

  loadingWindow.on('closed', () => {
    loadingWindow = null;
  });

  mainWindow = new BrowserWindow({
    show: false,
    width: 1366,
    height: 1100,
    webPreferences:
      process.env.NODE_ENV === 'development' || process.env.E2E_BUILD === 'true'
        ? {
            nodeIntegration: true
          }
        : {
            preload: path.join(__dirname, 'dist/renderer.prod.js')
          }
  });

  // const node = require('child_process').fork(
  //   path.join(__dirname, 'dist/server.prod.js'),
  //   []
  // );

  // node.on('close', (code: any) => {
  //   logger.info(`child process close all stdio with code ${code}`);
  // });

  // node.on('exit', (code: any) => {
  //   logger.info(`child process exited with code ${code}`);
  // });

  // node.on('message', logger.info);
  // node.on('error', logger.info);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
    if (loadingWindow) {
      loadingWindow.close();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  const loadingMenuBuilder = new MenuBuilder(loadingWindow);
  loadingMenuBuilder.buildMenu();

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', createWindow);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});
