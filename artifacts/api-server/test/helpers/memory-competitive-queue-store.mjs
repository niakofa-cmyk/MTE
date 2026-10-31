export class MemoryCompetitiveQueueStore {
  entries = new Map();
  claims = new Map();

  async enqueue(entry) {
    if (!this.entries.has(entry.userId)) {
      this.entries.set(entry.userId, { ...entry, claimId: null });
    }
  }

  async status(userId) {
    const ordered = [...this.entries.values()].sort(
      (left, right) => left.queuedAt - right.queuedAt || left.userId.localeCompare(right.userId),
    );
    const index = ordered.findIndex((entry) => entry.userId === userId);
    if (index < 0) return null;
    const { claimId: _claimId, ...entry } = ordered[index];
    return { entry, position: index + 1, queuedPlayers: ordered.length };
  }

  async cancel(userId) {
    const entry = this.entries.get(userId);
    if (!entry || entry.claimId) return false;
    return this.entries.delete(userId);
  }

  async claimNextBatch(matchSize, nowMs) {
    const queued = [...this.entries.values()]
      .filter((entry) => !entry.claimId)
      .sort((left, right) => left.queuedAt - right.queuedAt || left.userId.localeCompare(right.userId));
    if (queued.length < matchSize) return null;
    const oldest = queued[0];
    const maxGap = Math.min(1_000, 150 + Math.floor(Math.max(0, nowMs - oldest.queuedAt) / 10_000) * 100);
    const batch = queued.filter((entry) => Math.abs(entry.rating - oldest.rating) <= maxGap)
      .slice(0, matchSize);
    const selected = batch.length === matchSize || nowMs - oldest.queuedAt >= 90_000
      ? (batch.length === matchSize ? batch : queued.slice(0, matchSize))
      : [];
    if (selected.length !== matchSize) return null;

    const claimId = `test-claim-${this.claims.size + 1}`;
    for (const entry of selected) this.entries.get(entry.userId).claimId = claimId;
    this.claims.set(claimId, selected.map((entry) => entry.userId));
    return {
      claimId,
      entries: selected.map(({ claimId: _claimId, ...entry }) => ({ ...entry })),
    };
  }

  async completeClaim(claimId) {
    for (const userId of this.claims.get(claimId) ?? []) this.entries.delete(userId);
    this.claims.delete(claimId);
  }

  async releaseClaim(claimId) {
    for (const userId of this.claims.get(claimId) ?? []) {
      const entry = this.entries.get(userId);
      if (entry) entry.claimId = null;
    }
    this.claims.delete(claimId);
  }
}
