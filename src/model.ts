export type RankingRecord = {
  id: string;
  nickname: string;
  timeMs: number;
  createdAt: string;
};
export type Settings = {
  se: boolean;
  bgm: boolean;
  seVolume: number;
  bgmVolume: number;
  three: boolean;
  confetti: boolean;
  animation: boolean;
};
export const RANKING_KEY = "droneRaceRanking";
export const SETTINGS_KEY = "droneRaceSettings";
export const defaults: Settings = {
  se: true,
  bgm: false,
  seVolume: 0.6,
  bgmVolume: 0.15,
  three: true,
  confetti: true,
  animation: true,
};
export function normalizeNickname(value: string) {
  return Array.from(value.trim()).slice(0, 12).join("");
}
export function sortRanking(records: RankingRecord[]) {
  return [...records]
    .sort(
      (a, b) =>
        a.timeMs - b.timeMs ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 10);
}
export function loadRanking(): { records: RankingRecord[]; warning: string } {
  try {
    const raw = localStorage.getItem(RANKING_KEY);
    if (!raw) return { records: [], warning: "" };
    const list: unknown = JSON.parse(raw);
    if (
      !Array.isArray(list) ||
      list.some(
        (r) =>
          !r ||
          typeof r.id !== "string" ||
          typeof r.nickname !== "string" ||
          !r.nickname.trim() ||
          Array.from(r.nickname).length > 12 ||
          typeof r.timeMs !== "number" ||
          !Number.isFinite(r.timeMs) ||
          r.timeMs < 0 ||
          typeof r.createdAt !== "string" ||
          !Number.isFinite(Date.parse(r.createdAt)),
      )
    )
      throw new Error("invalid");
    if (new Set(list.map((r) => r.id)).size !== list.length)
      throw new Error("duplicates");
    return { records: sortRanking(list), warning: "" };
  } catch {
    return {
      records: [],
      warning:
        "保存済みランキングを読み込めません。管理画面で保存データをバックアップして確認してください。新しい記録の保存は保留されます。",
    };
  }
}
export function loadSettings(): Settings {
  try {
    const p = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    const s = { ...defaults };
    for (const k of ["se", "bgm", "three", "confetti", "animation"] as const)
      if (typeof p[k] === "boolean") s[k] = p[k];
    for (const k of ["seVolume", "bgmVolume"] as const)
      if (typeof p[k] === "number" && Number.isFinite(p[k]))
        s[k] = Math.max(0, Math.min(1, p[k]));
    return s;
  } catch {
    return { ...defaults };
  }
}
export function formatTime(ms: number) {
  const cs = Math.floor(Math.max(0, ms) / 10);
  return `${String(Math.floor(cs / 6000)).padStart(2, "0")}:${String(Math.floor(cs / 100) % 60).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
}
export function seconds(ms: number) {
  return (Math.floor(ms / 10) / 100).toFixed(2);
}
export function newId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `race-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}
export function saveJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
