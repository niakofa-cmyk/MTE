export type ClipboardWriter = Pick<Clipboard, "writeText">;

export async function copyMatchIdToClipboard(
  matchId: string,
  clipboard?: ClipboardWriter,
): Promise<boolean> {
  const value = matchId.trim();
  if (!value || !clipboard) return false;

  try {
    await clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
