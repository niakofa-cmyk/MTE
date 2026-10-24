import {
  commitExtraction,
  loadMars,
  saveMars,
  serializeMarsProfile,
  type ExtractedPiece,
  type MarsProfile,
} from "./mars-stash.ts";
import {
  loadRecord,
  recordExtraction,
  saveRecord,
  type RecordBook,
} from "./progress-record.ts";

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

function sameRecord(left: RecordBook, right: RecordBook) {
  return left.extractions === right.extractions &&
    left.best === right.best &&
    left.kills === right.kills &&
    left.scrap === right.scrap;
}

/**
 * Save the service record before applying the inventory reward. A profile
 * normalization or storage error must not prevent the completed extraction
 * from being recorded.
 */
export function persistExtractionWin(event: ExtractionWin): PersistedExtraction {
  let record = loadRecord();
  let recordSaved = false;

  try {
    const nextRecord = recordExtraction(record, event);
    recordSaved = saveRecord(nextRecord);
    record = loadRecord();
    recordSaved = recordSaved && sameRecord(record, nextRecord);
  } catch (error) {
    console.error("Could not persist the extraction service record.", error);
    record = loadRecord();
  }

  let mars = loadMars();
  let marsSaved = false;

  try {
    const nextMars = commitExtraction(mars, event.scrap, event.manifest);
    marsSaved = saveMars(nextMars);
    mars = loadMars();
    marsSaved = marsSaved &&
      serializeMarsProfile(mars) === serializeMarsProfile(nextMars);
  } catch (error) {
    console.error("Could not persist extraction rewards.", error);
    mars = loadMars();
  }

  return { mars, record, saved: recordSaved && marsSaved };
}
