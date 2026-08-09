/** Rotating in-browser auto-backups (separate from main teachdesk-v7 store). */

const SLOT_KEY = "teachdesk-v7-autobackups";
const META_KEY = "teachdesk-v7-autobackup-meta";
const MAX_SLOTS = 5;
const MIN_HOURS_BETWEEN = 6;

export type AutoBackupSlot = {
  id: string;
  at: string;
  label: string;
  /** Same shape as Settings export JSON */
  payload: Record<string, unknown>;
};

type Meta = {
  lastAutoAt?: string;
  nudgeDismissedAt?: string;
};

function readMeta(): Meta {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || "{}") as Meta;
  } catch {
    return {};
  }
}

function writeMeta(m: Meta) {
  localStorage.setItem(META_KEY, JSON.stringify(m));
}

export function listAutoBackups(): AutoBackupSlot[] {
  try {
    const raw = localStorage.getItem(SLOT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as AutoBackupSlot[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeSlots(slots: AutoBackupSlot[]) {
  localStorage.setItem(SLOT_KEY, JSON.stringify(slots.slice(0, MAX_SLOTS)));
}

/** Quietly save a rotating auto-backup if enough time has passed (or force). */
export function maybeAutoBackup(payload: Record<string, unknown>, force = false): AutoBackupSlot | null {
  if (typeof window === "undefined") return null;
  const meta = readMeta();
  const last = meta.lastAutoAt ? Date.parse(meta.lastAutoAt) : 0;
  const hours = (Date.now() - last) / 3_600_000;
  if (!force && last && hours < MIN_HOURS_BETWEEN) return null;

  const slot: AutoBackupSlot = {
    id: `ab-${Date.now()}`,
    at: new Date().toISOString(),
    label: `Auto · ${new Date().toLocaleString()}`,
    payload,
  };
  const next = [slot, ...listAutoBackups()].slice(0, MAX_SLOTS);
  writeSlots(next);
  writeMeta({ ...meta, lastAutoAt: slot.at });
  return slot;
}

export function getAutoBackup(id: string): AutoBackupSlot | undefined {
  return listAutoBackups().find((s) => s.id === id);
}

export function dismissBackupNudge() {
  writeMeta({ ...readMeta(), nudgeDismissedAt: new Date().toISOString() });
}

/** Show nudge if last *manual* backup older than days, and not dismissed this week. */
export function shouldShowBackupNudge(lastManualBackupAt: string | undefined, nudgeDays: number): boolean {
  if (typeof window === "undefined") return false;
  const meta = readMeta();
  if (meta.nudgeDismissedAt) {
    const dismissed = Date.parse(meta.nudgeDismissedAt);
    if (Date.now() - dismissed < 7 * 86_400_000) return false;
  }
  const last = lastManualBackupAt ? Date.parse(lastManualBackupAt) : 0;
  if (!last) return true;
  const days = (Date.now() - last) / 86_400_000;
  return days >= nudgeDays;
}
