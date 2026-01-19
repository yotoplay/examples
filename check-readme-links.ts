import { readdirSync, existsSync } from "node:fs";

const readme = await Bun.file("readme.md").text();

// Extract markdown links: [text](path)
const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
const links = [...readme.matchAll(linkRegex)]
  .map((m) => m[2])
  .filter((link) => !link.startsWith("http"));

// Get actual directories
const dirs = readdirSync(".", { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("."))
  .map((d) => d.name);

// Simple fuzzy match - find dir with most common characters
function suggest(brokenPath: string): string | null {
  const dirName = brokenPath.split("/")[0];
  let best = { dir: "", score: 0 };

  for (const dir of dirs) {
    const score = [...dirName].filter((c) => dir.includes(c)).length;
    if (score > best.score) best = { dir, score };
  }

  if (best.score > 2) {
    const rest = brokenPath.split("/").slice(1).join("/");
    const files = readdirSync(best.dir);
    const match = files.find((f) => f.toLowerCase() === rest.toLowerCase());
    return `${best.dir}/${match || rest}`;
  }
  return null;
}

let hasErrors = false;

// Case-insensitive file check (README.md vs readme.md)
function fileExists(path: string): boolean {
  if (existsSync(path)) return true;
  const parts = path.split("/");
  if (parts.length < 2) return false;
  const dir = parts.slice(0, -1).join("/");
  if (!existsSync(dir)) return false;
  const file = parts[parts.length - 1].toLowerCase();
  return readdirSync(dir).some((f) => f.toLowerCase() === file);
}

for (const link of links) {
  if (fileExists(link)) {
    console.log(`✅ ${link}`);
  } else {
    hasErrors = true;
    const suggestion = suggest(link);
    if (suggestion) {
      console.log(`❌ ${link} → ${suggestion}`);
    } else {
      console.log(`❌ ${link} (no suggestion)`);
    }
  }
}

if (hasErrors) {
  console.log("\nBroken links found!");
  process.exit(1);
} else {
  console.log("\nAll links valid!");
}
