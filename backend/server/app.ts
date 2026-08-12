import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "../routes/userRoutes";

const app = express();
const allowedOrigin = process.env.WEB_URL?.replace(/\/$/, "");

const uploadsRoot = path.join(__dirname, "..", "uploads");
const meterDir = path.join(uploadsRoot, "meter");
try {
  fs.mkdirSync(meterDir, { recursive: true });
} catch {
  /* ignore */
}

app.use(cookieParser());
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/uploads", express.static(uploadsRoot));
app.use("/api", userRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
