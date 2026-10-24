---
name: Progression persistence scope
description: When to keep Mission To Earth's progression local and when server authority becomes necessary.
---

Keep the current prototype's progression browser-local. Do not add a backend only to make the prototype playable. For multi-key extraction writes, stage the full next snapshots locally and replay them on startup; treat this as best-effort recovery, not server authority. Local saves are convenient but are not tamper-resistant, synchronized across devices, or recoverable after all browser data is erased.

**Why:** The user explicitly deferred account-linked progression and identified server-authoritative rewards as a later requirement. The persistence proposal's filesystem WAL would create a second profile store without authenticated identity or transaction ownership.

**How to apply:** For the solo prototype, validate/version local records and replay staged snapshots before loading them. Be clear about browser-local limits. If accounts or valuable persistent rewards are introduced, move profiles and inventories server-side and validate extraction claims with transaction identifiers and duplicate-claim protection; a client claim alone must not grant rewards.
