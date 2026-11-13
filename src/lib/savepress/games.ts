export type GameLink = {
  id: string;
  name: string;
  packageId: string;
  savePath: string;
  fileName: string;
  linkedAt: number;
};

const GAMES_KEY = "savepress.games";
const PENDING = "savepress.pendingLaunch";

const DENY = [
  "bank",
  "wallet",
  "paypal",
  "venmo",
  "cashapp",
  "coinbase",
  "binance",
  "authenticator",
  "1password",
  "bitwarden",
  "lastpass",
];

const ASSET =
  /\.(png|jpe?g|webp|gif|mp3|ogg|wav|mp4|webm|atlas|ttf|otf|woff2?|so|dex|pak|unity3d|bundle|assets|resource)$/i;

export function scoreSaveName(name: string): number {
  const lower = name.toLowerCase();
  if (ASSET.test(lower)) return -1;
  let score = 0;
  if (/\.(json|xml|txt|sav|cfg|ini|pref|prefs)$/.test(lower)) score += 3;
  if (/(save|slot|player|prefs|persistent|progress|profile|userdata)/.test(lower)) score += 5;
  if (lower.endsWith(".data") && /(save|persistent|player|game)/.test(lower)) score += 4;
  return score;
}

export function packageProblem(packageId: string): string | null {
  const pkg = packageId.trim();
  if (!pkg) return null;
  if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(pkg)) {
    return "Package names look like com.studio.game.";
  }
  const lower = pkg.toLowerCase();
  if (DENY.some((word) => lower.includes(word))) {
    return "Savepress won't open banking or login apps.";
  }
  return null;
}

export function launchHref(packageId: string): string {
  const problem = packageProblem(packageId);
  if (problem || !packageId.trim()) throw new Error(problem || "Add the Android package name.");
  return `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${packageId.trim()};end`;
}

export function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

export function loadGames(): GameLink[] {
  try {
    const raw = localStorage.getItem(GAMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GameLink[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGames(list: GameLink[]): void {
  localStorage.setItem(GAMES_KEY, JSON.stringify(list));
}

export function markPendingLaunch(id: string): void {
  sessionStorage.setItem(PENDING, id);
}

export function takePendingLaunch(): string | null {
  const id = sessionStorage.getItem(PENDING);
  if (!id) return null;
  sessionStorage.removeItem(PENDING);
  return id;
}
