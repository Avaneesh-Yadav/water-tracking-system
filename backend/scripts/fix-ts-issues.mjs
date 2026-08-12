/**
 * Fix common TypeScript migration issues across backend files.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "scripts") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".ts")) files.push(full);
  }
  return files;
}

for (const filePath of walk(root)) {
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;

  content = content.replace(/sameSite: 'Strict'/g, "sameSite: 'strict'");
  content = content.replace(/require\('dotenv'\)\.config\(\);?/g, "");
  content = content.replace(
    /const ACCESS_EXPIRY = process\.env\.JWT_ACCESS_EXPIRY \|\| '24h';/g,
    "const ACCESS_EXPIRY: jwt.SignOptions['expiresIn'] = process.env.JWT_ACCESS_EXPIRY || '24h';"
  );
  content = content.replace(
    /const REFRESH_EXPIRY = process\.env\.JWT_REFRESH_EXPIRY \|\| '7d';/g,
    "const REFRESH_EXPIRY: jwt.SignOptions['expiresIn'] = process.env.JWT_REFRESH_EXPIRY || '7d';"
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log("fixed:", path.relative(root, filePath));
  }
}

console.log("Done");
