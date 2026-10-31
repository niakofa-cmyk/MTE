import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const budgets = [
  {
    label: "Mission To Earth browser chunk",
    directory: path.join(workspaceRoot, "artifacts/mission-to-earth/dist/public/assets"),
    extension: ".js",
    maxBytes: 500_000,
  },
  {
    label: "API server JavaScript output",
    directory: path.join(workspaceRoot, "artifacts/api-server/dist"),
    extension: ".mjs",
    maxBytes: 1_000_000,
  },
];

let failed = false;

for (const budget of budgets) {
  let entries;
  try {
    entries = await readdir(budget.directory, { withFileTypes: true });
  } catch {
    console.error(`Missing build output: ${budget.directory}. Run the production build first.`);
    failed = true;
    continue;
  }

  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(budget.extension))
      .map(async (entry) => ({
        name: entry.name,
        bytes: (await stat(path.join(budget.directory, entry.name))).size,
      })),
  );

  if (files.length === 0) {
    console.error(`No ${budget.extension} outputs found in ${budget.directory}.`);
    failed = true;
    continue;
  }

  for (const file of files.sort((a, b) => b.bytes - a.bytes)) {
    const status = file.bytes > budget.maxBytes ? "OVER BUDGET" : "within budget";
    console.log(
      `${status}: ${budget.label}: ${file.name} ${(file.bytes / 1_000).toFixed(1)} kB / ${(budget.maxBytes / 1_000).toFixed(0)} kB`,
    );
    if (file.bytes > budget.maxBytes) failed = true;
  }
}

if (failed) {
  console.error("Bundle-size validation failed. Reduce the output or explicitly review the budget.");
  process.exitCode = 1;
}
