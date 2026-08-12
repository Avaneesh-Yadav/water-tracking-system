/**
 * Mechanical JS → TS conversion helper. Run from backend/: node scripts/convert-js-to-ts.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const skip = new Set([
  "node_modules",
  "dist",
  "uploads",
  "scripts",
]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

function convert(content, filePath) {
  let out = content;

  // require('x') → import x from 'x'
  out = out.replace(
    /const (\w+) = require\((['"])(.+?)\2\);/g,
    "import $1 from '$3';"
  );
  out = out.replace(
    /const \{([^}]+)\} = require\((['"])(.+?)\2\);/g,
    (_, names, __, mod) => {
      const cleaned = names
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)
        .join(", ");
      return `import { ${cleaned} } from '${mod}';`;
    }
  );

  // module.exports = X
  out = out.replace(/module\.exports\s*=\s*(\w+);/g, "export default $1;");
  out = out.replace(/module\.exports\s*=\s*\{([^}]+)\};/g, "export { $1 };");
  out = out.replace(/module\.exports\s*=\s*new /g, "export default new ");
  out = out.replace(/exports\.(\w+)\s*=/g, "export const $1 =");

  // Add eslint-style any for req/res in controllers if missing - handled by tsc later
  return out;
}

const files = walk(root).filter((f) => !f.includes(`${path.sep}dist${path.sep}`));
for (const jsPath of files) {
  const tsPath = jsPath.replace(/\.js$/, ".ts");
  if (fs.existsSync(tsPath)) {
    console.log("skip (ts exists):", path.relative(root, jsPath));
    continue;
  }
  const content = fs.readFileSync(jsPath, "utf8");
  fs.writeFileSync(tsPath, convert(content, jsPath));
  fs.unlinkSync(jsPath);
  console.log("converted:", path.relative(root, tsPath));
}

console.log("Done. Run: npx tsc --noEmit");
