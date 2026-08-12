/**
 * Adds Express handler types to converted controller files.
 * Run: node scripts/add-controller-types.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const controllersDir = path.join(__dirname, "..", "controllers");

const header = `import type { Response } from "express";
import type { AuthRequest } from "../types/express";
`;

for (const file of fs.readdirSync(controllersDir)) {
  if (!file.endsWith(".ts")) continue;
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  if (content.includes('from "../types/express"')) continue;

  const firstImport = content.match(/^import .+$/m);
  if (firstImport) {
    content = content.replace(firstImport[0], `${header}${firstImport[0]}`);
  } else {
    content = header + content;
  }

  content = content.replace(
    /export const (\w+) = async \(req, res\)/g,
    "export const $1 = async (req: AuthRequest, res: Response)"
  );
  content = content.replace(
    /export const (\w+) = \(req, res\)/g,
    "export const $1 = (req: AuthRequest, res: Response)"
  );
  content = content.replace(
    /exports\.(\w+) = async \(req, res\)/g,
    "export const $1 = async (req: AuthRequest, res: Response)"
  );
  content = content.replace(
    /exports\.(\w+) = \(req, res\)/g,
    "export const $1 = (req: AuthRequest, res: Response)"
  );

  fs.writeFileSync(filePath, content);
  console.log("typed:", file);
}

console.log("Done");
