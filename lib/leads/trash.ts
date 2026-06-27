export const TRASH_RETENTION_DAYS = 30;

const DAY_MS = 86_400_000;

/** Whole days until a soft-deleted lead is purged (deletedAt + retention window). */
export function purgeDaysLeft(deletedAt: Date): number {
  const remaining = deletedAt.getTime() + TRASH_RETENTION_DAYS * DAY_MS - Date.now();
  return Math.max(0, Math.ceil(remaining / DAY_MS));
}
