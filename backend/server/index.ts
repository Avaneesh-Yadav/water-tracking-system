import http from "http";
import type { Server } from "http";
import app from "./app";

const port = Number(process.env.PORT) || 8090;

function createServer(): Server {
  return http.createServer(app);
}

function startServer(server: Server): Promise<Server> {
  return new Promise((resolve, reject) => {
    server
      .listen(port, () => {
        console.log(`Server listening on port ${port}`);
        resolve(server);
      })
      .on("error", (err) => {
        console.error("Error starting server:", err);
        reject(err);
      });
  });
}

if (require.main === module) {
  import("dotenv").then((dotenv) => {
    dotenv.config();
    const server = createServer();
    startServer(server).catch(() => process.exit(1));
  });
}

export { createServer, startServer, app };
