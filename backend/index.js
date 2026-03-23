// Entry point: load env and start the server
require('dotenv').config();

const { createServer, startServer } = require('./server');

const server = createServer();
startServer(server).catch(() => process.exit(1));
