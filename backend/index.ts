import "./types/express";
import dotenv from "dotenv";
import { createServer, startServer } from "./server";

dotenv.config();

const server = createServer();
startServer(server).catch(() => process.exit(1));
