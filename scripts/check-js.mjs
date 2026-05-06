import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { extname, join } from "node:path";

const roots = ["src", "api", "tests", "scripts", "."];
const files = new Set();

async function collect(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !["node_modules", ".git", ".specify"].includes(entry.name)) {
      await collect(path);
    } else if (extname(entry.name) === ".js" || extname(entry.name) === ".mjs") {
      files.add(path);
    }
  }
}

for (const root of roots) {
  await collect(root);
}

for (const file of [...files].sort()) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--check", file], { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${file} failed syntax check`));
      }
    });
  });
}

console.log(`Checked ${files.size} JavaScript files.`);
