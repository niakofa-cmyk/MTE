---
name: Vite dev watcher lifecycle
description: Avoid silently disabling source watchers in Vite development plugins.
---

In Vite, a function returned from `configureServer` is a post-setup hook, not a server-close cleanup callback. Register long-lived file watchers in `configureServer` and dispose of their listeners when the Vite HTTP server closes.

**Why:** Returning a cleanup function from the hook removed the level-export watcher immediately after startup, so map edits updated the browser but did not regenerate the server asset.

**How to apply:** When adding Vite development watchers, attach lifecycle cleanup to `server.httpServer` close and verify an actual watched source edit triggers the worker.
