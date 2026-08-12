/** Patch query param access in controllers for TypeScript. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const controllersDir = path.join(__dirname, "..", "controllers");

const files = [
  "consumptionController.ts",
  "paymentController.ts",
  "reportController.ts",
  "userDashboardController.ts",
];

const importLine = `import { queryString } from '../utils/cast';\n`;

for (const file of files) {
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  if (!content.includes("queryString")) {
    const marker = 'from "../types/express";';
    if (content.includes(marker)) {
      content = content.replace(marker, `${marker}\n${importLine.trim()}`);
    }
  }

  content = content.replace(/\(req\.query\.(\w+) \|\| ''\)\.trim\(\)/g, "queryString(req.query.$1).trim()");
  content = content.replace(/parseInt\(req\.query\.(\w+), 10\)/g, "parseInt(queryString(req.query.$1), 10)");
  content = content.replace(/parseFloat\(req\.query\.(\w+)\)/g, "parseFloat(queryString(req.query.$1))");

  content = content.replace(/const settings = \{\};/g, "const settings: Record<string, unknown> = {};");
  content = content.replace(/const opts = \{\};/g, "const opts: Record<string, unknown> = {};");

  fs.writeFileSync(filePath, content);
  console.log("patched", file);
}

console.log("Done");
