---
name: Progression persistence scope
description: When to keep Mission To Earth's progression local and when server authority becomes necessary.
---

Keep the current prototype's progression browser-local. Do not add a backend only to make the prototype playable. Local saves are convenient but are not tamper-resistant, synchronized across devices, or recoverable after all browser data is erased.

**Why:** The user explicitly deferred account-linked progression and identified server-authoritative rewards as a later requirement.

**How to apply:** For the solo prototype, validate/version local records and be clear about their limits. If accounts or valuable persistent rewards are introduced, move profiles and inventories server-side and validate extraction claims with transaction identifiers and duplicate-claim protection; a client claim alone must not grant rewards.
