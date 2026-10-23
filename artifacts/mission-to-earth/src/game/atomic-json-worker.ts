import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface AtomicJsonWriteResult {
  path: string;
  byteLength: number;
}

export async function persistAtomicJson(
  json: string,
  outputPath: string,
  maxBytes: number,
): Promise<AtomicJsonWriteResult> {
  const byteLength = Buffer.byteLength(json, "utf8");
  if (byteLength > maxBytes) {
    throw new Error(`Generated JSON asset exceeds the ${maxBytes} byte file limit.`);
  }

  const targetPath = resolve(outputPath);
  const temporaryPath = `${targetPath}.${process.pid}.${randomUUID()}.tmp`;
  await mkdir(dirname(targetPath), { recursive: true });

  try {
    await writeFile(temporaryPath, json, { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }

  return { path: targetPath, byteLength };
}
