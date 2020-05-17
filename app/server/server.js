const winston = require('winston');
const path = require('path');
const { app, BrowserWindow } = require('electron');

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: path.join(app.getPath('userData'), 'server.log'),
      options: { flags: 'w' }
    })
  ]
});

logger.info('hello server');

process.on('uncaughtException', logger.info);
process.on('unhandledRejection', logger.info);

const { startServers } = require('./backend.lib');

startServers({
  userDataPath: app.getPath('userData')
});
