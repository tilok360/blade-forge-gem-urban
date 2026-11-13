export type StoredFile = {
  id: string;
  kind: "backup" | "recent";
  name: string;
  at: number;
  text: string;
  format: string;
};

export type UserRecipe = {
  id: string;
  title: string;
  match: "key" | "path";
  edits: { path: string; key: string; value: number | boolean }[];
  created: number;
};

const RECIPE_KEY = "savepress.recipes";
const CONSENT_KEY = "savepress.consent";

function openDb(): Promise<IDBDatabase> {
  return openSaveDb();
}

export function openSaveDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("savepress", 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("links")) {
        db.createObjectStore("links", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open storage"));
  });
}

function requestDone<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Storage request failed"));
  });
}

export function hasConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === "1";
}

export function grantConsent(): void {
  localStorage.setItem(CONSENT_KEY, "1");
}

export function loadRecipes(): UserRecipe[] {
  try {
    const raw = localStorage.getItem(RECIPE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserRecipe[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecipes(list: UserRecipe[]): void {
  localStorage.setItem(RECIPE_KEY, JSON.stringify(list));
}

export async function listFiles(): Promise<StoredFile[]> {
  const db = await openDb();
  try {
    const rows = await requestDone(db.transaction("files", "readonly").objectStore("files").getAll());
    return (rows as StoredFile[]).sort((a, b) => b.at - a.at);
  } finally {
    db.close();
  }
}

export async function putFile(file: StoredFile): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    store.put(file);
    const getAll = store.getAll();
    getAll.onsuccess = () => {
      const rows = (getAll.result as StoredFile[])
        .filter((row) => row.kind === file.kind)
        .sort((a, b) => b.at - a.at);
      const cap = file.kind === "backup" ? 12 : 8;
      for (const extra of rows.slice(cap)) store.delete(extra.id);
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not store the file"));
      tx.onabort = () => reject(tx.error ?? new Error("Storage aborted"));
    });
  } finally {
    db.close();
  }
}

export async function deleteStored(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not delete"));
    });
  } finally {
    db.close();
  }
}
