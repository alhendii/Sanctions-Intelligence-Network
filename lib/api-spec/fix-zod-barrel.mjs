import { readFile, writeFile } from "node:fs/promises";

const barrelPath = new URL("../api-zod/src/index.ts", import.meta.url);
const current = await readFile(barrelPath, "utf8");
const fixed = current
  .split("\n")
  .filter((line) => !line.includes("./generated/types"))
  .join("\n");

await writeFile(barrelPath, fixed.endsWith("\n") ? fixed : `${fixed}\n`);