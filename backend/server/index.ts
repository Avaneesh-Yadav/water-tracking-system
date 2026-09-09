import http from "http";
import type { Server } from "http";
import app from "./app";
import { ensureOpsSchema } from "../db/ensureOpsSchema";
import { runDueReminders } from "../controllers/opsController";

const port = Number(process.env.PORT) || 8090;

function createServer(): Server {
  return http.createServer(app);
}

function startServer(server: Server): Promise<Server> {
  return new Promise((resolve, reject) => {
    server
      .listen(port, async () => {
        try {
          await ensureOpsSchema();
        } catch (e) {
          console.error("Ops schema migrate failed", e);
        }
        console.log(`Server listening on port ${port}`);
        setInterval(() => {
          runDueReminders().catch((err) => console.warn("Reminder job", err?.message));
        }, 6 * 60 * 60 * 1000);
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
