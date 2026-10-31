---
name: Persistent reward identity
description: Authentication choice and trust boundary for account-linked Mission To Earth rewards.
---

Use Replit Auth as the account identity for Mission To Earth’s persistent extraction rewards.

**Why:** the user selected Replit Auth for server-owned reward persistence.

**How to apply:** Validate ownership through the server-side OIDC session. Never trust a client-supplied user ID or loot value. Keep local prototype saves separate until the server can validate extraction and settle rewards idempotently.
