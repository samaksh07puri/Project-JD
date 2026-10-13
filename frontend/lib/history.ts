import type { HistoryEntry, ServerHistoryEntry } from "./types";

function toEpoch(value: string): number {
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const zoned = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
  return new Date(zoned).getTime();
}

export function toClientEntry(row: ServerHistoryEntry): HistoryEntry {
  return {
    id: String(row.id),
    createdAt: toEpoch(row.created_at),
    fileName: row.file_name,
    score: row.score,
    jdPreview: row.jd_preview,
    response: row.response,
    deletedAt: row.deleted_at ? toEpoch(row.deleted_at) : null,
  };
}
