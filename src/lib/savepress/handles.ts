import { scoreSaveName, type GameLink } from "@/lib/savepress/games";
import { openSaveDb } from "@/lib/savepress/storage";

type AccessHandle = FileSystemHandle & {
  queryPermission(descriptor: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission(descriptor: { mode: "read" | "readwrite" }): Promise<PermissionState>;
};

type AccessDir = AccessHandle &
  FileSystemDirectoryHandle & {
    entries(): AsyncIterable<[string, AccessDir | AccessFile]>;
  };

type AccessFile = AccessHandle &
  FileSystemFileHandle & {
    kind: "file";
  };

function asDir(dir: FileSystemDirectoryHandle): AccessDir {
  return dir as AccessDir;
}

function asAccess(handle: FileSystemHandle): AccessHandle {
  return handle as AccessHandle;
}

export type FoundSave = {
  name: string;
  path: string;
  size: number;
  score: number;
  file?: File;
  handle?: FileSystemFileHandle;
};

type LinkRow = {
  id: string;
  fileHandle: FileSystemFileHandle | null;
  dirHandle: FileSystemDirectoryHandle | null;
};

const live = new Map<string, FileSystemFileHandle>();

type PickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
};

export function canPickDirectory(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickSaveDirectory(): Promise<FileSystemDirectoryHandle> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) throw new Error("This browser can't remember a folder.");
  return picker({ mode: "readwrite" });
}

export async function scanDirectory(dir: FileSystemDirectoryHandle): Promise<FoundSave[]> {
  const found: FoundSave[] = [];
  await walk(asDir(dir), "", 0, found);
  return found.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, 24);
}

async function walk(dir: AccessDir, prefix: string, depth: number, found: FoundSave[]): Promise<void> {
  if (depth > 3 || found.length >= 80) return;
  for await (const [name, entry] of dir.entries()) {
    if (found.length >= 80) return;
    if (name.startsWith(".")) continue;
    const path = prefix ? `${prefix}/${name}` : name;
    if (entry.kind === "file") {
      const score = scoreSaveName(name);
      if (score < 0) continue;
      const file = await entry.getFile();
      if (file.size > 8_000_000 || score === 0) continue;
      found.push({ name, path, size: file.size, score, handle: entry });
    } else {
      await walk(entry, path, depth + 1, found);
    }
  }
}

export function rememberLive(id: string, handle: FileSystemFileHandle): void {
  live.set(id, handle);
}

export function hasLiveHandle(id: string): boolean {
  return live.has(id);
}

export async function saveLinkHandles(
  id: string,
  fileHandle: FileSystemFileHandle | null,
  dirHandle: FileSystemDirectoryHandle | null,
): Promise<void> {
  if (fileHandle) live.set(id, fileHandle);
  const db = await openSaveDb();
  try {
    const tx = db.transaction("links", "readwrite");
    tx.objectStore("links").put({ id, fileHandle, dirHandle } satisfies LinkRow);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function deleteLinkHandles(id: string): Promise<void> {
  live.delete(id);
  const db = await openSaveDb();
  try {
    const tx = db.transaction("links", "readwrite");
    tx.objectStore("links").delete(id);
    await txDone(tx);
  } finally {
    db.close();
  }
}

async function readRow(id: string): Promise<LinkRow | null> {
  const db = await openSaveDb();
  try {
    const tx = db.transaction("links", "readonly");
    const row = await requestDone<LinkRow | undefined>(tx.objectStore("links").get(id));
    return row ?? null;
  } finally {
    db.close();
  }
}

async function ensurePermission(handle: FileSystemHandle, mode: "read" | "readwrite"): Promise<boolean> {
  const access = asAccess(handle);
  const current = await access.queryPermission({ mode });
  if (current === "granted") return true;
  const next = await access.requestPermission({ mode });
  return next === "granted";
}

async function fileAt(dir: FileSystemDirectoryHandle, path: string): Promise<FileSystemFileHandle | null> {
  const parts = path.split("/").filter(Boolean);
  if (!parts.length) return null;
  let current = asDir(dir);
  for (let i = 0; i < parts.length - 1; i++) {
    try {
      current = asDir(await current.getDirectoryHandle(parts[i]));
    } catch {
      return null;
    }
  }
  try {
    return await current.getFileHandle(parts[parts.length - 1]);
  } catch {
    return null;
  }
}

export async function readLinkedFile(game: GameLink): Promise<File | null> {
  const cached = live.get(game.id);
  if (cached) {
    try {
      if (await ensurePermission(cached, "read")) return await cached.getFile();
    } catch {
      live.delete(game.id);
    }
  }
  const row = await readRow(game.id);
  if (!row) return null;
  if (row.fileHandle) {
    try {
      if (await ensurePermission(row.fileHandle, "read")) {
        live.set(game.id, row.fileHandle);
        return await row.fileHandle.getFile();
      }
    } catch {
      /* try the folder */
    }
  }
  if (row.dirHandle && game.savePath) {
    try {
      if (!(await ensurePermission(row.dirHandle, "read"))) return null;
      const handle = await fileAt(row.dirHandle, game.savePath);
      if (!handle) return null;
      live.set(game.id, handle);
      await saveLinkHandles(game.id, handle, row.dirHandle);
      return await handle.getFile();
    } catch {
      return null;
    }
  }
  return null;
}

export async function writeLinked(id: string, text: string): Promise<boolean> {
  const handle = live.get(id);
  if (!handle) return false;
  if (!(await ensurePermission(handle, "readwrite"))) return false;
  const stream = await handle.createWritable();
  await stream.write(text);
  await stream.close();
  return true;
}

function requestDone<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Storage request failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not store the link"));
    tx.onabort = () => reject(tx.error ?? new Error("Storage aborted"));
  });
}
