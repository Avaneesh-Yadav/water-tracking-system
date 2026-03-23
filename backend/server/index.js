/**
 * HTTP server creation and startup.
 * Creates server from Express app and starts listening.
 */
const http = require('http');
const app = require('./app');

const port = process.env.PORT || 3000;

function createServer() {
  const server = http.createServer(app);
  return server;
}

function startServer(server) {
  return new Promise((resolve, reject) => {
    server
      .listen(port, () => {
        console.log(`Server listening on port ${port}`);
        resolve(server);
      })
      .on('error', (err) => {
        console.error('Error starting server:', err);
        reject(err);
      });
  });
}

// If this file is run directly (e.g. node server/index.js), start the server
if (require.main === module) {
  require('dotenv').config();
  const server = createServer();
  startServer(server).catch(() => process.exit(1));
}

module.exports = { createServer, startServer, app };
