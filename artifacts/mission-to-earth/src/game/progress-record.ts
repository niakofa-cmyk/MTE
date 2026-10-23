import { readLocalItem, writeLocalItem } from "./local-storage.ts";

const KEY = "mte-record-v2";
const BACKUP_KEY = "mte-record-v2-backup";
const LEGACY_KEY = "mte-record-v1";
const VERSION = 2;
const MAX_COUNT = 999_999_999;

export type RecordBook = {
  extractions: number;
  best: number;
  kills: number;
  scrap: number;
};

export function emptyRecord(): RecordBook {
  return { extractions: 0, best: 0, kills: 0, scrap: 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function count(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_COUNT, Math.floor(value)))
    : 0;
}

function normalizeRecord(value: unknown): RecordBook | null {
  if (!isRecord(value)) return null;
  return {
    extractions: count(value.extractions),
    best: typeof value.best === "number" && Number.isFinite(value.best) && value.best > 0
      ? Math.min(86_400, value.best)
      : 0,
    kills: count(value.kills),
    scrap: count(value.scrap),
  };
}

export function parseRecord(raw: string | null): RecordBook | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if ("schemaVersion" in parsed) {
      if (parsed.schemaVersion !== VERSION) return null;
      return normalizeRecord(parsed.record);
    }
    return normalizeRecord(parsed);
  } catch {
    return null;
  }
}

export function loadRecord() {
  return (
    parseRecord(readLocalItem(KEY)) ??
    parseRecord(readLocalItem(BACKUP_KEY)) ??
    parseRecord(readLocalItem(LEGACY_KEY)) ??
    emptyRecord()
  );
}

export function saveRecord(record: RecordBook) {
  const normalized = normalizeRecord(record) ?? emptyRecord();
  const serialized = JSON.stringify({ schemaVersion: VERSION, record: normalized });
  const previous = readLocalItem(KEY);
  if (previous && parseRecord(previous)) writeLocalItem(BACKUP_KEY, previous);
  if (!writeLocalItem(KEY, serialized)) return false;
  writeLocalItem(BACKUP_KEY, serialized);
  return true;
}

export function recordExtraction(
  previous: RecordBook,
  extraction: { time: number; kills: number; scrap: number },
) {
  const base = normalizeRecord(previous) ?? emptyRecord();
  const time = typeof extraction.time === "number" && Number.isFinite(extraction.time)
    ? Math.max(0, Math.min(86_400, extraction.time))
    : 0;
  return {
    extractions: Math.min(MAX_COUNT, base.extractions + 1),
    best: base.best === 0 ? time : Math.min(base.best, time),
    kills: Math.min(MAX_COUNT, base.kills + count(extraction.kills)),
    scrap: Math.min(MAX_COUNT, base.scrap + count(extraction.scrap)),
  };
}
