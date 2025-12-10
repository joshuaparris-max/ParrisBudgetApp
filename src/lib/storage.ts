import { promises as fs } from "fs";
import path from "path";

const BASE_DIR = process.env.STORAGE_DIR || "./storage";

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function saveUpload(file: File, subdir: string, filename: string) {
  const dir = path.join(BASE_DIR, subdir);
  await ensureDir(dir);
  const fullPath = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(fullPath, buffer);
  return fullPath;
}

export async function writeTextFile(content: string, subdir: string, filename: string) {
  const dir = path.join(BASE_DIR, subdir);
  await ensureDir(dir);
  const fullPath = path.join(dir, filename);
  await fs.writeFile(fullPath, content, "utf-8");
  return fullPath;
}
