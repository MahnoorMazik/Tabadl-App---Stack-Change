import { existsSync } from "fs";
import { mkdir, unlink } from "fs/promises";
import { basename, join, resolve, sep } from "path";

/** Relative path stored in DB for new uploads (not web-accessible). */
export function supportStorageRelativePath(filename: string): string {
  return `private/uploads/support/${filename}`;
}

export function getSupportUploadDir(): string {
  return join(process.cwd(), "private", "uploads", "support");
}

export async function ensureSupportUploadDir(): Promise<void> {
  await mkdir(getSupportUploadDir(), { recursive: true });
}

export function supportDownloadUrl(filename: string): string {
  return `/api/documents/download/support/${filename}`;
}

/** Extract safe filename from legacy or private stored paths. */
export function filenameFromStoredPath(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const match = normalized.match(/(?:^|\/)support\/(.+)$/);
  if (!match?.[1]) return null;
  const name = basename(match[1]);
  if (!name || name === "." || name === "..") return null;
  return name;
}

function isPathInsideDir(filePath: string, dir: string): boolean {
  return filePath === dir || filePath.startsWith(dir + sep);
}

/** Resolve on-disk path; prefers private, falls back to legacy public/uploads/support. */
export function resolveSupportAttachmentDiskPath(filePath: string): string | null {
  const filename = filenameFromStoredPath(filePath);
  if (!filename) return null;

  const privateDir = resolve(getSupportUploadDir());
  const privateFile = resolve(join(privateDir, filename));
  if (!isPathInsideDir(privateFile, privateDir)) return null;

  if (existsSync(privateFile)) return privateFile;

  const legacyDir = resolve(process.cwd(), "public", "uploads", "support");
  const legacyFile = resolve(join(legacyDir, filename));
  if (!isPathInsideDir(legacyFile, legacyDir)) return null;
  if (existsSync(legacyFile)) return legacyFile;

  return privateFile;
}

export async function unlinkSupportAttachment(filePath: string): Promise<void> {
  const filename = filenameFromStoredPath(filePath);
  if (!filename) return;

  const privateDir = resolve(getSupportUploadDir());
  const legacyDir = resolve(process.cwd(), "public", "uploads", "support");

  for (const dir of [privateDir, legacyDir]) {
    const file = resolve(join(dir, filename));
    if (!isPathInsideDir(file, dir)) continue;
    try {
      await unlink(file);
    } catch {
      /* missing file is fine */
    }
  }
}
