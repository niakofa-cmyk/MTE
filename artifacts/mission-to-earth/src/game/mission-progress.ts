import {
  commitExtraction,
  loadMars,
  parseMarsProfile,
  saveMars,
  serializeMarsProfile,
  type ExtractedPiece,
  type MarsProfile,
} from "./mars-stash.ts";
import {
  loadRecord,
  parseRecord,
  recordExtraction,
  saveRecord,
  type RecordBook,
} from "./progress-record.ts";
import { readLocalItem, removeLocalItem, writeLocalItem } from "./local-storage.ts";

const JOURNAL_KEY = "mte-extraction-wal-v1";
const JOURNAL_VERSION = 1;

export type ExtractionWin = {
  time: number;
  kills: number;
  scrap: number;
  manifest: ExtractedPiece[];
};

export type PersistedExtraction = {
  mars: MarsProfile;
  record: RecordBook;
  saved: boolean;
};

export type ExtractionRecovery = {
  mars: MarsProfile;
  record: RecordBook;
  pending: boolean;
};

type ExtractionJournal = {
  schemaVersion: typeof JOURNAL_VERSION;
  mars: MarsProfile;
  record: RecordBook;
};

function sameRecord(left: RecordBook, right: RecordBook) {
  return left.extractions === right.extractions &&
    left.best === right.best &&
    left.kills === right.kills &&
    left.scrap === right.scrap;
}

function parseJournal(raw: string): ExtractionJournal | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const candidate = parsed as Record<string, unknown>;
    if (candidate.schemaVersion !== JOURNAL_VERSION) return null;

    const record = parseRecord(JSON.stringify(candidate.record));
    const mars = parseMarsProfile(JSON.stringify(candidate.mars));
    if (!record || !mars) return null;
    return { schemaVersion: JOURNAL_VERSION, record, mars };
  } catch {
    return null;
  }
}

function applyJournal(journal: ExtractionJournal): PersistedExtraction {
  let record = loadRecord();
  let mars = loadMars();
  let recordSaved = false;
  let marsSaved = false;

  try {
    recordSaved = saveRecord(journal.record);
    record = loadRecord();
    recordSaved = recordSaved && sameRecord(record, journal.record);
  } catch (error) {
    console.error("Could not replay the extraction service record.", error);
  }

  try {
    marsSaved = saveMars(journal.mars);
    mars = loadMars();
    marsSaved = marsSaved &&
      serializeMarsProfile(mars) === serializeMarsProfile(journal.mars);
  } catch (error) {
    console.error("Could not replay extraction rewards.", error);
  }

  return { mars, record, saved: recordSaved && marsSaved };
}

/**
 * Replay a staged extraction snapshot before the UI loads saved progression.
 * Snapshots make replay safe: applying the same journal twice does not add the
 * reward twice. A failed or invalid journal is retained and surfaced to the UI.
 */
export function recoverPendingExtraction(): ExtractionRecovery {
  let record = loadRecord();
  let mars = loadMars();
  const raw = readLocalItem(JOURNAL_KEY);
  if (raw === null) return { record, mars, pending: false };

  const journal = parseJournal(raw);
  if (!journal) {
    console.error("The pending extraction journal is invalid; leaving it in place.");
    return { record, mars, pending: true };
  }

  const applied = applyJournal(journal);
  record = applied.record;
  mars = applied.mars;
  if (!applied.saved) return { record, mars, pending: true };

  const cleared = removeLocalItem(JOURNAL_KEY) && readLocalItem(JOURNAL_KEY) === null;
  return { record, mars, pending: !cleared };
}

/**
 * Stage the complete next state before updating either save. If a browser
 * shutdown interrupts the two writes, startup replays this absolute snapshot.
 */
export function persistExtractionWin(event: ExtractionWin): PersistedExtraction {
  const current = recoverPendingExtraction();
  if (current.pending) {
    return { mars: current.mars, record: current.record, saved: false };
  }

  const nextRecord = recordExtraction(current.record, event);
  const nextMars = commitExtraction(current.mars, event.scrap, event.manifest);
  const serialized = JSON.stringify({
    schemaVersion: JOURNAL_VERSION,
    record: nextRecord,
    mars: nextMars,
  } satisfies ExtractionJournal);
  if (!writeLocalItem(JOURNAL_KEY, serialized) || readLocalItem(JOURNAL_KEY) !== serialized) {
    return { mars: current.mars, record: current.record, saved: false };
  }

  const recovered = recoverPendingExtraction();
  return {
    mars: recovered.mars,
    record: recovered.record,
    saved: !recovered.pending &&
      sameRecord(recovered.record, nextRecord) &&
      serializeMarsProfile(recovered.mars) === serializeMarsProfile(nextMars),
  };
}
